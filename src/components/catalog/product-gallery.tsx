"use client"

import Image from "next/image"
import { useState } from "react"
import { HiOutlinePhoto } from "react-icons/hi2"
import { cn } from "@/lib/utils"
import type { ProductImage } from "@/types/catalog"

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const visible = images.filter((image) => image.url)
  const [index, setIndex] = useState(0)
  const current = visible[Math.min(index, visible.length - 1)]

  if (!current?.url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted-foreground">
        <HiOutlinePhoto className="size-14" aria-hidden />
        <span className="sr-only">Produto sem imagens</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-elevated">
        <Image
          key={current.id}
          src={current.url}
          alt={current.altText || productName}
          fill
          preload={index === 0}
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {visible.length > 1 ? (
        <div role="group" aria-label="Imagens do produto" className="grid grid-cols-5 gap-2">
          {visible.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagem ${i + 1} de ${visible.length}`}
              aria-pressed={i === index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-surface-elevated transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                i === index ? "border-gold" : "border-border hover:border-foreground/30",
              )}
            >
              <Image src={image.url ?? ""} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
