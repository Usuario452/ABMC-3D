"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import {
  HiArrowTopRightOnSquare,
  HiCheckCircle,
  HiExclamationTriangle,
  HiNoSymbol,
  HiOutlineArrowUpTray,
  HiOutlineCalculator,
  HiOutlineCube,
  HiOutlineLink,
  HiOutlineLockClosed,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineQuestionMarkCircle,
  HiOutlineSparkles,
  HiOutlineStar,
  HiOutlineTag,
  HiStar,
  HiOutlineTrash,
} from "react-icons/hi2"
import type { IconType } from "react-icons"
import { toast } from "sonner"
import { deleteProductImage, registerProductImages, reorderProductImages, storeProductImage } from "@/actions/images"
import { importFromMakerWorld } from "@/actions/makerworld"
import { createProduct, deleteProduct, updateProduct } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { CategoryFormDialog } from "@/components/admin/category-form-dialog"
import { ConfirmDelete } from "@/components/admin/confirm-delete"
import { PriceCalculatorDialog } from "@/components/admin/price-calculator"
import { LinkTextarea } from "@/components/admin/link-textarea"
import { ModalHeader } from "@/components/admin/modal-header"
import { MarkdownEditor } from "@/components/admin/markdown-editor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AdminProduct } from "@/lib/data/admin"
import { centsToInputValue, maskPriceInput } from "@/lib/format"
import { prepareImageForUpload } from "@/lib/image-compress"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGES_PER_PRODUCT } from "@/lib/images"
import type { MakerWorldModel } from "@/lib/makerworld"
import { licenseAllowsSale, licenseLabel, makerWorldModelUrl, parseMakerWorldId } from "@/lib/makerworld-link"
import { cn } from "@/lib/utils"
import { productSchema, type ProductData, type ProductInput } from "@/lib/validation/schemas"
import type { ProductImage } from "@/types/catalog"

const ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(",")

type CategoryOption = { id: string; name: string; is_active: boolean }

/**
 * Foto mostrada no painel: já enviada (edição) ou na fila, enviada logo depois de criar o produto. Na fila,
 * vem do computador (`file`) ou do MakerWorld (`remote`, só exibida pelo link e baixada ao criar).
 */
type Photo = { key: string; url: string | null; saved?: ProductImage; file?: File; remote?: string }

/** Foto ainda não enviada: arquivo do computador ou link de uma foto do MakerWorld. */
type PhotoSource = File | string

/** Quantas fotos são processadas e enviadas ao mesmo tempo. */
const UPLOAD_CONCURRENCY = 4

/** Tempo da animação de saída do modal antes de avisar quem o abriu. */
const CLOSE_ANIMATION_MS = 150

/**
 * Cadastro e edição de produto em modal. Quem abre controla o estado (e a URL, ?novo=1 ou ?editar=<id>);
 * ao fechar, o modal anima a saída e chama `onClose`.
 */
export function ProductDialog({
  product,
  categories,
  onClose,
}: {
  /** Produto em edição; ausente no cadastro. */
  product?: AdminProduct
  categories: CategoryOption[]
  onClose: () => void
}) {
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()
  // Categorias do seletor; "Nova" acrescenta a criada no modal de categoria e já a seleciona.
  const [categoryList, setCategoryList] = useState(categories)
  const [creatingCategory, setCreatingCategory] = useState(false)
  // Calculadora de preço num modal; o resultado preenche o campo de preço.
  const [calculating, setCalculating] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (product?.images ?? []).map((image) => ({ key: image.id, url: image.url, saved: image })),
  )
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const isEdit = Boolean(product)

  const form = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      internalNotes: product?.internal_notes ?? "",
      price: product ? centsToInputValue(product.price_cents) : "",
      categoryId: product?.category_id ?? "",
      isActive: product?.is_active ?? true,
      // "Ativo" já decide se o produto aparece; disponibilidade não é mais editada à parte.
      isAvailable: true,
      isFeatured: product?.is_featured ?? false,
    },
  })
  const { errors, isDirty } = form.formState
  const priceInput = form.register("price")
  const notesValue = useWatch({ control: form.control, name: "internalNotes" })
  const busy = isPending || uploading !== null

  // Libera as prévias locais (fotos na fila) ao sair.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(
    () => () => {
      for (const photo of photosRef.current) if (photo.file && photo.url) URL.revokeObjectURL(photo.url)
      // O aviso de licença acompanha o cadastro: sai junto com o modal.
      toast.dismiss(LICENSE_TOAST_ID)
    },
    [],
  )

  // Fecha na hora pelo estado local e só avisa quem abriu depois da animação de saída.
  const [open, setOpen] = useState(true)
  const leave = () => {
    toast.dismiss(LICENSE_TOAST_ID)
    setOpen(false)
    setTimeout(onClose, CLOSE_ANIMATION_MS)
  }
  const close = () => {
    if (!busy) leave()
  }

  /** Envia as fotos em sequência (mantém a ordem e evita requisições grandes simultâneas). */
  /**
   * Envia as fotos: até UPLOAD_CONCURRENCY ao mesmo tempo, cada uma otimizada e gravada no R2 (as do
   * MakerWorld são baixadas pelo próprio servidor); no fim, uma única chamada registra todas, na ordem.
   */
  async function uploadFiles(productId: string, productName: string, files: PhotoSource[]) {
    setUploading({ done: 0, total: files.length })
    const stored: (string | null)[] = new Array(files.length).fill(null)
    let done = 0
    let stop = false

    const storeOne = async (index: number) => {
      const source = files[index]
      const formData = new FormData()
      formData.set("productId", productId)
      if (typeof source === "string") {
        formData.set("url", source)
      } else {
        const prepared = await prepareImageForUpload(source)
        if (!prepared.ok) {
          toast.error(prepared.error)
          return
        }
        formData.set("file", prepared.file)
      }
      try {
        const result = await storeProductImage(formData)
        if (result.ok) stored[index] = result.data.storagePath
        else if (!feedback(result) && result.code === "unauthenticated") stop = true
      } catch {
        networkErrorToast()
        stop = true
      }
    }

    // Fila simples: cada "trabalhador" pega a próxima foto até acabarem.
    let next = 0
    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, async () => {
        while (!stop && next < files.length) {
          const index = next++
          await storeOne(index)
          done += 1
          setUploading({ done, total: files.length })
        }
      }),
    )

    const paths = stored.filter((path): path is string => path !== null)
    let uploaded: ProductImage[] = []
    if (paths.length > 0) {
      try {
        const result = await registerProductImages(productId, paths, productName)
        if (result.ok) uploaded = result.data
        else feedback(result)
      } catch {
        networkErrorToast()
      }
    }
    setUploading(null)
    return uploaded
  }

  async function addFiles(fileList: FileList | File[] | null) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    const remaining = MAX_IMAGES_PER_PRODUCT - photos.length
    if (files.length > remaining) {
      toast.error(remaining > 0 ? `Você pode adicionar mais ${remaining} foto(s).` : "Limite de fotos atingido.")
      return
    }
    if (product) {
      const uploaded = await uploadFiles(product.id, form.getValues("name") || product.name, files)
      if (uploaded.length > 0) {
        setPhotos((current) => [...current, ...uploaded.map((image) => ({ key: image.id, url: image.url, saved: image }))])
        toast.success(uploaded.length === 1 ? "Foto enviada." : `${uploaded.length} fotos enviadas.`)
      }
    } else {
      setPhotos((current) => [
        ...current,
        ...files.map((file) => ({ key: crypto.randomUUID(), url: URL.createObjectURL(file), file })),
      ])
    }
  }

  async function removePhoto(photo: Photo) {
    if (photo.saved) {
      try {
        const result = await deleteProductImage(photo.saved.id)
        if (!feedback(result)) return false
      } catch {
        networkErrorToast()
        return false
      }
    } else if (photo.file && photo.url) {
      URL.revokeObjectURL(photo.url)
    }
    setPhotos((current) => current.filter((item) => item.key !== photo.key))
    return true
  }

  /** Nova ordem das fotos (a primeira é a principal). Na edição, grava no servidor; no cadastro, só na fila. */
  function reorder(next: Photo[]) {
    const previous = photos
    setPhotos(next)
    if (!product) return
    startTransition(async () => {
      try {
        const result = await reorderProductImages(
          product.id,
          next.flatMap((item) => (item.saved ? [item.saved.id] : [])),
        )
        if (!feedback(result)) setPhotos(previous)
      } catch {
        setPhotos(previous)
        networkErrorToast()
      }
    })
  }

  const onSubmit = form.handleSubmit((values) => {
    // Envia o texto original do preço; o servidor converte e valida novamente.
    const input: ProductInput = { ...values, price: form.getValues("price") }
    startTransition(async () => {
      try {
        if (product) {
          const result = await updateProduct(product.id, input)
          applyFieldErrors(result)
          if (feedback(result)) leave()
          return
        }
        const result = await createProduct(input)
        applyFieldErrors(result)
        if (!result.ok) {
          feedback(result)
          return
        }
        const queued = photos.flatMap((photo): PhotoSource[] => photo.file ? [photo.file] : photo.remote ? [photo.remote] : [])
        const uploaded = queued.length > 0 ? await uploadFiles(result.data.id, values.name, queued) : []
        toast.success(
          queued.length === 0
            ? "Produto criado."
            : uploaded.length === queued.length
              ? `Produto criado com ${uploaded.length} ${uploaded.length === 1 ? "foto" : "fotos"}.`
              : "Produto criado, mas algumas fotos não foram enviadas. Abra o produto para tentar de novo.",
        )
        leave()
      } catch {
        networkErrorToast()
      }
    })
  })

  function applyFieldErrors(result: { ok: boolean; fieldErrors?: Record<string, string[] | undefined> }) {
    if (result.ok || !result.fieldErrors) return
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (messages?.[0]) form.setError(field as keyof ProductInput, { message: messages[0] })
    }
  }

  async function remove() {
    if (!product) return false
    try {
      const ok = feedback(await deleteProduct(product.id), "Produto excluído.")
      if (ok) leave()
      return ok
    } catch {
      networkErrorToast()
      return false
    }
  }

  const category = categories.find((item) => item.id === product?.category_id)
  const isPublic = Boolean(product?.is_active && product.is_available && category?.is_active)

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-4xl"
        onInteractOutside={(event) => {
          // Clicar fora fecha, exceto enquanto salva ou envia fotos.
          if (busy) event.preventDefault()
        }}
      >
        <ModalHeader
          icon={HiOutlineCube}
          title={product ? "Editar produto" : "Novo produto"}
          description={product ? "Edite os dados, as fotos e a visibilidade." : "Preencha os dados e adicione as fotos do produto."}
          onClose={close}
          closeDisabled={busy}
          actions={
            isPublic && product ? (
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link href={`/produtos/${product.slug}`} target="_blank">
                  <HiArrowTopRightOnSquare aria-hidden />
                  Ver na loja
                </Link>
              </Button>
            ) : null
          }
        />

        <form id="product-form" method="post" onSubmit={onSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
          {/* grid-cols-1 (minmax 0) no celular: sem ele a coluna cresce com as fotos e estoura a largura do modal. */}
          <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 md:grid-cols-[260px_minmax(0,1fr)]">
            <PhotoPanel
              photos={photos}
              uploading={uploading}
              disabled={busy}
              onAdd={addFiles}
              onRemove={removePhoto}
              onReorder={reorder}
            />

            <div className="grid min-w-0 grid-cols-1 content-start gap-x-4 gap-y-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)} className="sm:col-span-2">
                <FieldLabel htmlFor="product-name">Nome <span className="text-destructive" aria-hidden>*</span></FieldLabel>
                <div className="relative">
                  <HiOutlineCube
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="product-name"
                    aria-required
                    placeholder="Ex.: Dragão articulado"
                    className="pl-9"
                    aria-invalid={Boolean(errors.name)}
                    {...form.register("name")}
                  />
                </div>
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={Boolean(errors.price)}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="product-price">Preço <span className="text-destructive" aria-hidden>*</span></FieldLabel>
                  <button
                    type="button"
                    onClick={() => setCalculating(true)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-gold transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <HiOutlineCalculator className="size-3.5" aria-hidden />
                    Calcular
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="product-price"
                    aria-required
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0,00"
                    className="pl-9 tabular-nums"
                    aria-invalid={Boolean(errors.price)}
                    {...priceInput}
                    onChange={(event) => {
                      // Máscara de moeda: os dígitos entram pela direita, como centavos.
                      event.target.value = maskPriceInput(event.target.value)
                      priceInput.onChange(event)
                    }}
                  />
                </div>
                <FieldError errors={[errors.price]} />
              </Field>

              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Field data-invalid={Boolean(errors.categoryId)}>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="product-category">Categoria <span className="text-destructive" aria-hidden>*</span></FieldLabel>
                      <button
                        type="button"
                        onClick={() => setCreatingCategory(true)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-gold transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <HiOutlinePlus className="size-3.5" aria-hidden />
                        Nova
                      </button>
                    </div>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      open={categoryOpen}
                      onOpenChange={setCategoryOpen}
                    >
                      <SelectTrigger
                        id="product-category"
                        aria-required
                        className="w-full"
                        aria-invalid={Boolean(errors.categoryId)}
                        onBlur={field.onBlur}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <HiOutlineTag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <SelectValue placeholder="Selecione" />
                        </span>
                      </SelectTrigger>
                      {/* "popper" abre abaixo do campo; o padrão alinha ao item escolhido e, sem itens, não aparece. */}
                      <SelectContent position="popper" align="start">
                        {categoryList.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                            {!item.is_active ? " (inativa)" : ""}
                          </SelectItem>
                        ))}
                        {categoryList.length === 0 ? (
                          <div className="flex flex-col items-center gap-2.5 px-3 py-4 text-center">
                            <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryOpen(false)
                                setCreatingCategory(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <HiOutlinePlus className="size-3.5" aria-hidden />
                              Criar categoria
                            </button>
                          </div>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[errors.categoryId]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Field data-invalid={Boolean(errors.description)} className="sm:col-span-2">
                    <FieldLabel htmlFor="product-description">Descrição</FieldLabel>
                    <MarkdownEditor
                      id="product-description"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={Boolean(errors.description)}
                    />
                    <FieldError errors={[errors.description]} />
                  </Field>
                )}
              />

              <div className="sm:col-span-2">
                <ToggleRow
                  control={form.control}
                  name="isFeatured"
                  icon={HiOutlineStar}
                  label="Destaque"
                  hint="Aparece na seção de destaques da página inicial."
                />
              </div>

              <Field data-invalid={Boolean(errors.internalNotes)} className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="product-notes">Anotação interna</FieldLabel>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <HiOutlineLockClosed className="size-3.5" aria-hidden />
                    Só no painel
                  </span>
                </div>
                <LinkTextarea
                  id="product-notes"
                  rows={3}
                  placeholder="Lembretes para você: origem do modelo, filamento, ajustes de impressão…"
                  aria-invalid={Boolean(errors.internalNotes)}
                  text={notesValue ?? ""}
                  {...form.register("internalNotes")}
                />
                <FieldError errors={[errors.internalNotes]} />
              </Field>
            </div>
          </div>
        </form>

        {/* Fora do <form>: o envio do formulário de categoria não pode subir até o do produto. */}
        <PriceCalculatorDialog
          open={calculating}
          onOpenChange={setCalculating}
          onUse={(priceCents) =>
            form.setValue("price", centsToInputValue(priceCents), { shouldDirty: true, shouldValidate: true })
          }
        />
        <CategoryFormDialog
          open={creatingCategory}
          onOpenChange={setCreatingCategory}
          onSaved={(saved) => {
            setCategoryList((current) =>
              [...current, saved].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
            )
            form.setValue("categoryId", saved.id, { shouldDirty: true, shouldValidate: true })
          }}
        />

        {!isEdit ? (
          <MakerWorldImportDialog
            open={importing}
            onOpenChange={setImporting}
            onImported={(model) => {
              form.setValue("name", model.name, { shouldDirty: true, shouldValidate: true })
              form.setValue("description", model.description, { shouldDirty: true })
              form.setValue("internalNotes", withImportSource(form.getValues("internalNotes") ?? "", model.url), {
                shouldDirty: true,
              })
              licenseToast(model)
              // As fotos aparecem pelo link do MakerWorld; nada é baixado antes de criar o produto.
              setPhotos((current) => [
                ...current,
                ...model.images
                  .slice(0, Math.max(MAX_IMAGES_PER_PRODUCT - current.length, 0))
                  .map((url) => ({ key: crypto.randomUUID(), url, remote: url })),
              ])
            }}
          />
        ) : null}

        {/* No celular: "Ativo" numa linha e as ações lado a lado embaixo, para sobrar espaço ao formulário. */}
        <footer className="flex flex-col gap-2.5 border-t border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            {/* Ativo fica no rodapé, junto das ações: é a decisão de publicar ou não. */}
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={busy} />
                  <span className={field.value ? "" : "text-muted-foreground"}>{field.value ? "Ativo" : "Inativo"}</span>
                </label>
              )}
            />
            {product ? (
              <ConfirmDelete
                title="Excluir produto?"
                description={<><strong className="font-medium text-foreground">{product.name}</strong> e as fotos serão apagados de vez. Para só ocultar da loja, desative-o.</>}
                onConfirm={remove}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <HiOutlineTrash aria-hidden />
                    Excluir
                  </Button>
                }
              />
            ) : null}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {uploading
                ? `Enviando foto ${uploading.done + 1 > uploading.total ? uploading.total : uploading.done + 1} de ${uploading.total}…`
                : product && isDirty
                  ? "Alterações não salvas."
                  : null}
            </p>
          </div>
          <div className="flex gap-2">
            {!isEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setImporting(true)}
                disabled={busy}
                className="border-gold/50 bg-transparent text-gold hover:bg-gold/10 hover:text-gold"
              >
                <HiOutlineSparkles aria-hidden />
                <span className="sr-only sm:not-sr-only">Importar</span>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={close} disabled={busy} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="submit" form="product-form" disabled={busy || (isEdit && !isDirty)} className="flex-1 sm:flex-none">
              {isPending ? "Salvando…" : product ? "Salvar alterações" : "Criar produto"}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

function PhotoPanel({
  photos,
  uploading,
  disabled,
  onAdd,
  onRemove,
  onReorder,
}: {
  photos: Photo[]
  uploading: { done: number; total: number } | null
  disabled: boolean
  onAdd: (files: FileList | null) => void
  onRemove: (photo: Photo) => Promise<boolean>
  onReorder: (next: Photo[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // Reordenação por arrastar: foto sendo arrastada e a posição sobre a qual está.
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const full = photos.length >= MAX_IMAGES_PER_PRODUCT
  const canAdd = !disabled && !full
  const [primary] = photos

  const pick = () => inputRef.current?.click()

  const move = (fromKey: string, toKey: string) => {
    const from = photos.findIndex((photo) => photo.key === fromKey)
    const to = photos.findIndex((photo) => photo.key === toKey)
    if (from < 0 || to < 0 || from === to) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
  }
  const makePrimary = (photo: Photo) => onReorder([photo, ...photos.filter((item) => item.key !== photo.key)])
  // Arquivos vindos do computador (não a reordenação das miniaturas).
  const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes("Files")

  return (
    <div
      className="space-y-3"
      onDragOver={(event) => {
        if (!isFileDrag(event)) return
        event.preventDefault()
        if (canAdd) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!isFileDrag(event)) return
        event.preventDefault()
        setDragging(false)
        if (canAdd) onAdd(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        disabled={!canAdd}
        onChange={(event) => {
          onAdd(event.target.files)
          event.target.value = ""
        }}
      />

      {primary ? (
        <div
          className={cn(
            "group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-foreground/5 md:aspect-square",
            (dragging || (dragKey && overKey === primary.key)) && "ring-2 ring-gold/60",
          )}
          // Soltar uma miniatura aqui a torna a principal.
          onDragOver={(event) => {
            if (!dragKey) return
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
            setOverKey(primary.key)
          }}
          onDrop={(event) => {
            if (!dragKey) return
            event.preventDefault()
            event.stopPropagation()
            move(dragKey, primary.key)
            setDragKey(null)
            setOverKey(null)
          }}
        >
          {primary.url ? (
            <Image src={primary.url} alt="" fill sizes="260px" className="object-cover" unoptimized={!primary.saved} />
          ) : null}
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            <HiStar className="size-3 text-gold-light" aria-hidden />
            Principal
          </span>
          {!primary.saved ? (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
              Envia ao criar
            </span>
          ) : null}
          <PhotoActions photo={primary} disabled={disabled} onRemove={onRemove} />
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={!canAdd}
          className={cn(
            "group flex aspect-[2/1] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 md:aspect-square border-dashed border-border px-6 text-center transition-colors outline-none hover:border-gold/50 hover:bg-gold/5 focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging && "border-gold bg-gold/5",
          )}
        >
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground transition-colors group-hover:bg-gold/10 group-hover:text-gold">
            <HiOutlinePhoto className="size-7" aria-hidden />
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-sm">
              <HiOutlinePlus className="size-3.5" aria-hidden />
            </span>
          </span>
          <span>
            <span className="block text-sm font-medium">{dragging ? "Solte as fotos aqui" : "Adicionar fotos"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">Clique ou arraste · JPG, PNG ou WebP</span>
          </span>
        </button>
      )}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {/* A principal já aparece grande acima; aqui ficam só as demais. */}
          {photos.slice(1).map((photo) => (
            <li
              key={photo.key}
              draggable={!disabled}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", photo.key)
                setDragKey(photo.key)
              }}
              onDragOver={(event) => {
                if (!dragKey) return
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
                setOverKey(photo.key)
              }}
              onDrop={(event) => {
                if (!dragKey) return
                event.preventDefault()
                event.stopPropagation()
                move(dragKey, photo.key)
                setDragKey(null)
                setOverKey(null)
              }}
              onDragEnd={() => {
                setDragKey(null)
                setOverKey(null)
              }}
              title="Arraste para mudar a ordem"
              className={cn(
                "group relative aspect-square cursor-grab overflow-hidden rounded-lg bg-muted transition-opacity active:cursor-grabbing",
                "ring-1 ring-foreground/5",
                dragKey === photo.key && "opacity-40",
                overKey === photo.key && dragKey !== photo.key && "ring-2 ring-gold/70 ring-offset-2 ring-offset-popover",
              )}
            >
              {photo.url ? (
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="64px"
                  draggable={false}
                  className="pointer-events-none object-cover"
                  unoptimized={!photo.saved}
                />
              ) : null}
              <PhotoActions
                photo={photo}
                disabled={disabled}
                onRemove={onRemove}
                onMakePrimary={makePrimary}
                compact
              />
            </li>
          ))}
          {!full ? (
            <li>
              <button
                type="button"
                onClick={pick}
                disabled={!canAdd}
                aria-label="Adicionar mais fotos"
                className={cn(
                  "flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors outline-none hover:border-gold/50 hover:bg-gold/5 hover:text-gold focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  dragging && "border-gold bg-gold/5 text-gold",
                )}
              >
                <HiOutlinePlus className="size-4" aria-hidden />
                <span className="text-[10px] font-medium">Adicionar</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite">
        {uploading ? (
          <span className="flex items-center gap-1.5 text-gold">
            <HiOutlineArrowUpTray className="size-3.5 animate-pulse" aria-hidden />
            Enviando {Math.min(uploading.done + 1, uploading.total)} de {uploading.total}…
          </span>
        ) : (
          <span>{photos.length > 1 ? "Arraste para ordenar ou solte na foto grande para torná-la principal." : "A primeira foto é a principal."}</span>
        )}
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium tabular-nums">
          {photos.length}/{MAX_IMAGES_PER_PRODUCT}
        </span>
      </div>
    </div>
  )
}

function PhotoActions({
  photo,
  disabled,
  onRemove,
  onMakePrimary,
  compact = false,
}: {
  photo: Photo
  disabled: boolean
  onRemove: (photo: Photo) => Promise<boolean>
  onMakePrimary?: (photo: Photo) => void
  compact?: boolean
}) {
  const button =
    "flex items-center justify-center rounded-md bg-black/60 text-white transition-colors outline-none hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
  const size = compact ? "size-5" : "size-8"
  const icon = compact ? "size-3" : "size-4"

  const removeButton = (
    <button type="button" disabled={disabled} aria-label="Remover foto" className={cn(button, size)}>
      <HiOutlineTrash className={icon} aria-hidden />
    </button>
  )

  return (
    <div className={cn("absolute flex gap-1", compact ? "top-1 right-1" : "top-2 right-2")}>
      {onMakePrimary ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMakePrimary(photo)}
          aria-label="Tornar principal"
          title="Tornar principal"
          className={cn(button, size, "opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}
        >
          <HiOutlineStar className={icon} aria-hidden />
        </button>
      ) : null}
      {photo.saved ? (
        <ConfirmDelete
          title="Remover foto?"
          description="Ela sai do produto e é apagada do armazenamento."
          confirmLabel="Remover"
          pendingLabel="Removendo…"
          onConfirm={() => onRemove(photo)}
          trigger={removeButton}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRemove(photo)}
          aria-label="Remover foto"
          className={cn(button, size)}
        >
          <HiOutlineTrash className={icon} aria-hidden />
        </button>
      )}
    </div>
  )
}

function ToggleRow({
  control,
  name,
  icon: Icon,
  label,
  hint,
}: {
  control: ReturnType<typeof useForm<ProductInput, unknown, ProductData>>["control"]
  name: "isActive" | "isAvailable" | "isFeatured"
  icon: IconType
  label: string
  hint: string
}) {
  const id = `product-${name}`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
            field.value ? "border-gold/50" : "border-border",
          )}
        >
          <Icon className="size-5 shrink-0 text-gold" aria-hidden />
          <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
            <span className="block text-sm font-medium">{label}</span>
            <span id={`${id}-hint`} className="block text-xs text-muted-foreground">
              {hint}
            </span>
          </label>
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} aria-describedby={`${id}-hint`} />
        </div>
      )}
    />
  )
}

/**
 * Importa um modelo do MakerWorld pelo link: nome, descrição e fotos. Busca tudo com o modal aberto e
 * só fecha quando os dados estão prontos para revisar. Preço e categoria ficam com o usuário.
 */
function MakerWorldImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (model: MakerWorldModel) => void
}) {
  const feedback = useActionFeedback()
  const [link, setLink] = useState("")
  const [loading, setLoading] = useState(false)
  const linkInput = useRef<HTMLInputElement>(null)
  const modelId = parseMakerWorldId(link)
  // Troca o link colado pelo limpo (só domínio e ID), sem idioma, slug, parâmetros nem âncora.
  const clean = (value: string) => {
    const id = parseMakerWorldId(value)
    setLink(id ? makerWorldModelUrl(id) : value)
  }

  async function run() {
    if (!modelId || loading) return
    setLoading(true)
    try {
      const result = await importFromMakerWorld(makerWorldModelUrl(modelId))
      if (!feedback(result)) return
      onImported(result.data)
      setLink("")
      onOpenChange(false)
    } catch {
      networkErrorToast()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (loading ? null : onOpenChange(next))}>
      <DialogContent
        className="overflow-hidden sm:max-w-md"
        showCloseButton={!loading}
        onOpenAutoFocus={(event) => {
          // O foco inicial vai para o campo do link, não para o botão de ajuda (que abriria o tooltip).
          event.preventDefault()
          linkInput.current?.focus()
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <ImportLoading />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              className="grid gap-4"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <HiOutlineSparkles className="size-4 text-gold" aria-hidden />
                Importar do MakerWorld
              </DialogTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Como funciona"
                    className="rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <HiOutlineQuestionMarkCircle className="size-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Traz nome, descrição e fotos do modelo. Preço e categoria você preenche depois.
                </TooltipContent>
              </Tooltip>
            </div>
            <DialogDescription className="text-sm">Cole o link do modelo.</DialogDescription>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                // Não deixa o envio subir até o formulário do produto.
                event.stopPropagation()
                run()
              }}
            >
              <div className="relative">
                <HiOutlineLink
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="text"
                  inputMode="url"
                  ref={linkInput}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Link do modelo no MakerWorld"
                  aria-invalid={Boolean(link.trim()) && !modelId}
                  aria-describedby="makerworld-link-status"
                  placeholder="makerworld.com/en/models/…"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault()
                    clean(event.clipboardData.getData("text"))
                  }}
                  onBlur={() => clean(link)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p id="makerworld-link-status" className="flex min-w-0 items-center gap-1.5 text-xs" aria-live="polite">
                  {modelId ? (
                    <>
                      <HiCheckCircle className="size-4 shrink-0 text-gold" aria-hidden />
                      <span className="text-muted-foreground">
                        Modelo <span className="font-medium text-foreground tabular-nums">{modelId}</span>
                      </span>
                    </>
                  ) : link.trim() ? (
                    <span className="text-destructive">Link do MakerWorld não reconhecido.</span>
                  ) : null}
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!modelId}>
                    Importar
                  </Button>
                </div>
              </div>
            </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

/** Tela de espera da importação: ocupa o modal inteiro até os dados chegarem. */
function ImportLoading() {
  const reduceMotion = useReducedMotion()
  // Quando o MakerWorld bloqueia, o servidor tenta de novo sozinho; depois de alguns segundos, avisa.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3_000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <DialogTitle className="sr-only">Importando do MakerWorld</DialogTitle>
      <DialogDescription className="sr-only">Aguarde enquanto os dados do modelo são carregados.</DialogDescription>

      <div className="relative flex size-24 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-dashed border-gold/40"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          className="flex size-14 items-center justify-center rounded-2xl bg-gold/10 text-gold"
          animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
        >
          <HiOutlineCube className="size-7" aria-hidden />
        </motion.span>
      </div>

      <div aria-live="polite">
        <p className="text-sm font-semibold">Buscando o modelo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {slow ? "O MakerWorld está demorando, tentando de novo…" : "Lendo dados do MakerWorld…"}
        </p>
      </div>

      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/3 rounded-full bg-gold"
          animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
          transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
        />
      </div>
    </div>
  )
}

const IMPORT_SOURCE_PREFIX = "Importado de "

/** Registra na anotação o link de origem; numa nova importação, troca a linha anterior em vez de repetir. */
function withImportSource(notes: string, url: string) {
  const others = notes.split("\n").filter((line) => !line.startsWith(IMPORT_SOURCE_PREFIX))
  return [`${IMPORT_SOURCE_PREFIX}${url}`, ...others].join("\n").trim()
}

const LICENSE_TOAST_ID = "makerworld-license"

/**
 * Aviso discreto, no canto inferior direito, sobre a licença do modelo importado. É só um lembrete:
 * não impede o cadastro. Fica visível enquanto o modal estiver aberto (uma nova importação o substitui).
 */
function licenseToast(model: MakerWorldModel) {
  const allowed = licenseAllowsSale(model.license)
  const notice =
    allowed === true
      ? { title: "Licença permite venda", icon: <HiCheckCircle className="size-6 text-success" /> }
      : allowed === false
        ? { title: "Licença não permite venda", icon: <HiNoSymbol className="size-6 text-destructive" /> }
        : { title: "Confira a licença", icon: <HiExclamationTriangle className="size-6 text-gold" /> }

  toast(notice.title, {
    id: LICENSE_TOAST_ID,
    position: "bottom-right",
    duration: Infinity,
    dismissible: false,
    closeButton: false,
    icon: notice.icon,
    description: (
      <span className="flex flex-wrap items-center gap-x-1.5">
        <span>{licenseLabel(model.license) ?? "Licença não informada"}</span>
        <span aria-hidden>·</span>
        <a
          href={model.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold underline-offset-4 hover:underline"
        >
          Ver no MakerWorld
        </a>
      </span>
    ),
    classNames: {
      toast: "items-center! gap-x-3.5! py-3! pr-5! pl-4!",
      icon: "mt-0! size-6!",
      title: "text-[0.8125rem]! font-medium!",
      description: "text-xs! text-foreground/65!",
    },
  })
}
