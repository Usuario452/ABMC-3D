"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { HiOutlineArrowPath, HiOutlinePhoto, HiOutlineTag, HiOutlineTrash } from "react-icons/hi2"
import { createCategory, removeCategoryCover, updateCategory, uploadCategoryCover } from "@/actions/categories"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { prepareImageForUpload } from "@/lib/image-compress"
import { ALLOWED_IMAGE_TYPES } from "@/lib/images"
import { cn } from "@/lib/utils"
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas"

const ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(",")

type SavedCategory = { id: string; name: string; is_active: boolean }

type Props = {
  /** Botão que abre o modal. Sem ele, use `open`/`onOpenChange` para controlar a abertura. */
  trigger?: ReactNode
  category?: { id: string; name: string; slug: string; is_active: boolean; coverUrl?: string | null }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Chamado após salvar (ex.: o cadastro de produto seleciona a categoria recém-criada). */
  onSaved?: (category: SavedCategory) => void
}

export function CategoryFormDialog({ trigger, category, open: controlledOpen, onOpenChange, onSaved }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-0.5 border-b border-border/60 px-5 py-4 pr-12">
          <DialogTitle className="text-base">{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription className="text-xs">Categorias inativas e seus produtos ficam ocultos na loja.</DialogDescription>
        </DialogHeader>
        {open ? (
          <CategoryForm
            category={category}
            onDone={(saved) => {
              if (saved) onSaved?.(saved)
              setOpen(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  category,
  onDone,
}: {
  category?: Props["category"]
  onDone: (saved?: SavedCategory) => void
}) {
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()
  // Capa (opcional): arquivo novo escolhido, ou a remoção da atual. Só vai ao servidor ao salvar.
  const [cover, setCover] = useState<{ file: File; url: string } | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const coverFile = cover?.file ?? null
  const coverPreview = cover?.url ?? (coverRemoved ? null : (category?.coverUrl ?? null))

  // A prévia local (blob:) é liberada ao trocar, remover ou fechar o modal.
  const coverRef = useRef(cover)
  useEffect(() => {
    coverRef.current = cover
  }, [cover])
  useEffect(() => () => {
    if (coverRef.current) URL.revokeObjectURL(coverRef.current.url)
  }, [])
  const replaceCover = (file: File | null) => {
    if (cover) URL.revokeObjectURL(cover.url)
    setCover(file ? { file, url: URL.createObjectURL(file) } : null)
  }

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      isActive: category?.is_active ?? true,
    },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const result = category ? await updateCategory(category.id, values) : await createCategory(values)
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) form.setError(field as keyof CategoryInput, { message: messages[0] })
          }
        }
        if (!feedback(result)) return
        const id = category?.id ?? (result.data as { id: string }).id

        // A capa vai depois da categoria (a criação precisa do id). Uma falha aqui não desfaz a categoria.
        if (coverFile) {
          const prepared = await prepareImageForUpload(coverFile)
          if (!prepared.ok) {
            feedback({ ok: false, error: prepared.error })
          } else {
            const formData = new FormData()
            formData.set("categoryId", id)
            formData.set("file", prepared.file)
            const cover = await uploadCategoryCover(formData)
            if (!cover.ok) feedback(cover)
          }
        } else if (coverRemoved && category?.coverUrl) {
          const removal = await removeCategoryCover(id)
          if (!removal.ok) feedback(removal)
        }

        onDone({ id, name: values.name.trim(), is_active: values.isActive })
      } catch {
        networkErrorToast()
      }
    })
  })

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-5 p-5">
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="category-name">
            Nome <span className="text-destructive" aria-hidden>*</span>
          </FieldLabel>
          <div className="relative">
            <HiOutlineTag
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="category-name"
              aria-required
              placeholder="Ex.: Decoração"
              className="pl-9"
              aria-invalid={Boolean(errors.name)}
              {...form.register("name")}
            />
          </div>
          <FieldError errors={[errors.name]} />
        </Field>

        <CoverField
          preview={coverPreview}
          disabled={isPending}
          onPick={(file) => {
            replaceCover(file)
            setCoverRemoved(false)
          }}
          onRemove={() => {
            replaceCover(null)
            setCoverRemoved(true)
          }}
        />
      </FieldGroup>
      <DialogFooter className="mx-0 mb-0 border-border/60 bg-muted/30 px-5 py-3 sm:items-center sm:justify-between">
        {/* Ativa fica no rodapé, junto das ações, como no cadastro de produto. */}
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
              <span className={field.value ? "" : "text-muted-foreground"}>{field.value ? "Ativa" : "Inativa"}</span>
            </label>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onDone()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : category ? "Salvar alterações" : "Criar categoria"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

const OVERLAY_BUTTON =
  "flex size-8 items-center justify-center rounded-md bg-black/60 text-white transition-colors outline-none hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"

/** Capa opcional da categoria: escolher, trocar ou remover, com prévia. */
function CoverField({
  preview,
  disabled,
  onPick,
  onRemove,
}: {
  preview: string | null
  disabled: boolean
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const pick = () => inputRef.current?.click()
  // Só arquivos vindos do computador (não textos ou links arrastados).
  const isFileDrag = (event: React.DragEvent) => event.dataTransfer.types.includes("Files")

  return (
    <Field
      onDragOver={(event) => {
        if (!isFileDrag(event) || disabled) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
        setDragging(true)
      }}
      onDragLeave={(event) => {
        // Ignora a passagem por elementos internos; só conta quando sai do campo.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(event) => {
        if (!isFileDrag(event)) return
        event.preventDefault()
        setDragging(false)
        if (disabled) return
        const file = [...event.dataTransfer.files].find((item) => item.type in ALLOWED_IMAGE_TYPES)
        if (file) onPick(file)
        else toast.error("Solte uma imagem JPG, PNG ou WebP.")
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor="category-cover">Capa</FieldLabel>
        <span className="text-xs text-muted-foreground">Opcional</span>
      </div>
      <input
        ref={inputRef}
        id="category-cover"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.target.value = ""
        }}
      />
      {preview ? (
        <div
          className={cn(
            "relative aspect-[16/7] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/5",
            dragging && "ring-2 ring-gold",
          )}
        >
          <Image src={preview} alt="" fill sizes="420px" className="object-cover" unoptimized={preview.startsWith("blob:")} />
          {dragging ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white">
              Solte para trocar a capa
            </span>
          ) : null}
          <div className="absolute top-2 right-2 flex gap-1">
            <button type="button" onClick={pick} disabled={disabled} aria-label="Trocar capa" title="Trocar capa" className={OVERLAY_BUTTON}>
              <HiOutlineArrowPath className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remover capa" title="Remover capa" className={OVERLAY_BUTTON}>
              <HiOutlineTrash className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={disabled}
          className={cn(
            "flex aspect-[16/7] w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors outline-none hover:border-gold/50 hover:bg-gold/5 hover:text-gold focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            dragging && "border-gold bg-gold/5 text-gold",
          )}
        >
          <HiOutlinePhoto className="size-6" aria-hidden />
          <span className="text-xs font-medium">{dragging ? "Solte a imagem aqui" : "Adicionar capa"}</span>
          <span className="text-[11px]">Clique ou arraste · JPG, PNG ou WebP</span>
        </button>
      )}
    </Field>
  )
}
