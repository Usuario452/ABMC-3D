"use client"

import Image from "next/image"
import { useId, useRef, useState, useTransition } from "react"
import {
  HiArrowLeft,
  HiArrowRight,
  HiOutlineArrowUpTray,
  HiOutlinePhoto,
  HiOutlineStar,
  HiOutlineTrash,
} from "react-icons/hi2"
import { toast } from "sonner"
import {
  deleteProductImage,
  reorderProductImages,
  updateImageAlt,
  uploadProductImage,
} from "@/actions/images"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { ConfirmDelete } from "@/components/admin/confirm-delete"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { prepareImageForUpload } from "@/lib/image-compress"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGES_PER_PRODUCT } from "@/lib/images"
import { cn } from "@/lib/utils"
import type { ProductImage } from "@/types/catalog"

const ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(",")

export function ImageManager({
  productId,
  productName,
  initialImages,
}: {
  productId: string
  productName: string
  initialImages: ProductImage[]
}) {
  const feedback = useActionFeedback()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [images, setImages] = useState(initialImages)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [isReordering, startReorder] = useTransition()
  const [dragging, setDragging] = useState(false)
  const remaining = MAX_IMAGES_PER_PRODUCT - images.length
  const busy = progress !== null || isReordering

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (inputRef.current) inputRef.current.value = ""
    if (files.length === 0) return
    if (files.length > remaining) {
      toast.error(`Você pode adicionar mais ${remaining} imagem(ns) a este produto.`)
      return
    }

    setProgress({ done: 0, total: files.length })
    let uploaded = 0
    // Envio sequencial: mantém a ordem escolhida e evita requisições grandes simultâneas.
    for (const [index, original] of files.entries()) {
      const prepared = await prepareImageForUpload(original)
      if (!prepared.ok) {
        toast.error(prepared.error)
      } else {
        const formData = new FormData()
        formData.set("productId", productId)
        formData.set("altText", productName)
        formData.set("file", prepared.file)
        try {
          const result = await uploadProductImage(formData)
          if (result.ok) {
            uploaded += 1
            setImages((current) => [...current, result.data])
          } else {
            feedback(result)
            if (result.code === "unauthenticated") break
          }
        } catch {
          networkErrorToast()
          break
        }
      }
      setProgress({ done: index + 1, total: files.length })
    }
    setProgress(null)
    if (uploaded > 0) toast.success(uploaded === 1 ? "Imagem enviada." : `${uploaded} imagens enviadas.`)
  }

  function saveOrder(next: ProductImage[]) {
    const previous = images
    setImages(next.map((image, position) => ({ ...image, position })))
    startReorder(async () => {
      try {
        const result = await reorderProductImages(
          productId,
          next.map((image) => image.id),
        )
        if (!feedback(result)) setImages(previous)
      } catch {
        setImages(previous)
        networkErrorToast()
      }
    })
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    saveOrder(next)
  }

  function makePrimary(index: number) {
    if (index === 0) return
    const next = [...images]
    const [chosen] = next.splice(index, 1)
    saveOrder([chosen, ...next])
  }

  async function remove(imageId: string) {
    try {
      const result = await deleteProductImage(imageId)
      if (!feedback(result)) return false
      setImages((current) =>
        current.filter((image) => image.id !== imageId).map((image, position) => ({ ...image, position })),
      )
      return true
    } catch {
      networkErrorToast()
      return false
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Imagens</CardTitle>
        <CardDescription>
          A primeira imagem é a principal (usada nos cards). JPEG, PNG ou WebP; as imagens são convertidas para
          WebP otimizado (até 1600 px). Até {MAX_IMAGES_PER_PRODUCT} por produto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy && remaining > 0) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (!busy && remaining > 0) handleFiles(event.dataTransfer.files)
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-gold bg-gold/5" : "border-border bg-muted/30",
            (busy || remaining <= 0) && "opacity-60",
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            disabled={busy || remaining <= 0}
            onChange={(event) => handleFiles(event.target.files)}
          />
          <span className="flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold">
            <HiOutlineArrowUpTray className="size-6" aria-hidden />
          </span>
          <p className="text-sm font-medium">
            {progress ? `Enviando ${progress.done} de ${progress.total}…` : "Arraste as imagens aqui"}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy || remaining <= 0}
            aria-describedby={`${inputId}-status`}
          >
            <HiOutlinePhoto aria-hidden />
            Selecionar imagens
          </Button>
          <p id={`${inputId}-status`} className="text-xs text-muted-foreground" aria-live="polite">
            {remaining <= 0 ? "Limite de imagens atingido." : `${images.length} de ${MAX_IMAGES_PER_PRODUCT} imagens.`}
          </p>
        </div>

        {images.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="relative aspect-square bg-surface-elevated">
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.altText || productName}
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ) : null}
                  {index === 0 ? <Badge className="absolute top-2 left-2">Principal</Badge> : null}
                </div>
                <div className="space-y-3 p-3">
                  <AltTextEditor image={image} onSaved={(alt) =>
                    setImages((current) => current.map((item) => (item.id === image.id ? { ...item, altText: alt } : item)))
                  } />
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label={`Mover imagem ${index + 1} para a esquerda`}
                    >
                      <HiArrowLeft aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(index, 1)}
                      disabled={busy || index === images.length - 1}
                      aria-label={`Mover imagem ${index + 1} para a direita`}
                    >
                      <HiArrowRight aria-hidden />
                    </Button>
                    {index !== 0 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => makePrimary(index)} disabled={busy}>
                        <HiOutlineStar aria-hidden />
                        Tornar principal
                      </Button>
                    ) : null}
                    <div className="ml-auto">
                      <ConfirmDelete
                        title="Remover imagem?"
                        description="A imagem será removida do produto e apagada do armazenamento."
                        confirmLabel="Remover"
                        onConfirm={() => remove(image.id)}
                        trigger={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            aria-label={`Remover imagem ${index + 1}`}
                          >
                            <HiOutlineTrash aria-hidden />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AltTextEditor({ image, onSaved }: { image: ProductImage; onSaved: (alt: string) => void }) {
  const feedback = useActionFeedback()
  const [value, setValue] = useState(image.altText)
  const [isPending, startTransition] = useTransition()
  const id = `alt-${image.id}`
  const changed = value.trim() !== image.altText

  return (
    <form
      className="space-y-1.5"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          try {
            const result = await updateImageAlt(image.id, value)
            if (feedback(result)) onSaved(value.trim())
          } catch {
            networkErrorToast()
          }
        })
      }}
    >
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Texto alternativo (acessibilidade)
      </Label>
      <div className="flex gap-2">
        <Input id={id} value={value} maxLength={200} onChange={(event) => setValue(event.target.value)} className="h-8" />
        <Button type="submit" size="sm" variant="secondary" disabled={!changed || isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
