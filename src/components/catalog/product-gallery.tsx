"use client"

import Image from "next/image"
import { useState } from "react"
import { HiChevronLeft, HiChevronRight, HiOutlinePhoto } from "react-icons/hi2"
import { cn } from "@/lib/utils"
import type { ProductImage } from "@/types/catalog"

/** Sombra limpa dos cards da loja (a mesma do card de produto). */
const CARD_SHADOW = "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-14px_rgb(0_0_0/0.18)] ring-1 ring-black/[0.03] dark:ring-white/[0.06]"

/**
 * Galeria da página do produto: a foto grande, sem moldura, (com setas quando há mais de uma) e as
 * miniaturas numa coluna à esquerda (embaixo, no celular), a escolhida com contorno dourado.
 */
export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const visible = images.filter((image) => image.url)
  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, Math.max(visible.length - 1, 0))
  const current = visible[safeIndex]

  if (!current?.url) {
    return (
      <div>
        <div className={cn("flex aspect-square items-center justify-center rounded-xl bg-surface-elevated text-muted-foreground", CARD_SHADOW)}>
          <HiOutlinePhoto className="size-14" aria-hidden />
          <span className="sr-only">Produto sem imagens</span>
        </div>
      </div>
    )
  }

  const go = (step: number) => setIndex((safeIndex + step + visible.length) % visible.length)

  return (
    // No tablet/desktop as miniaturas ficam numa coluna à esquerda, da altura da foto (rolam se forem muitas);
    // no celular, numa linha embaixo.
    <div className={cn("relative space-y-2.5", visible.length > 1 && "md:space-y-0 md:pl-[4.25rem]")}>
      <div className="group relative">
        <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-surface-elevated", CARD_SHADOW)}>
          <Image
            key={current.id}
            src={current.url}
            alt={current.altText || productName}
            fill
            fetchPriority={safeIndex === 0 ? "high" : undefined}
            loading="eager"
            sizes="(min-width: 1024px) 580px, (min-width: 768px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
        {visible.length > 1 ? (
          <>
            <GalleryArrow side="left" onClick={() => go(-1)} />
            <GalleryArrow side="right" onClick={() => go(1)} />
            <span className="absolute right-4 bottom-4 rounded-full bg-black/55 px-2 py-0.5 text-[0.7rem] font-medium text-white tabular-nums">
              {safeIndex + 1} / {visible.length}
            </span>
          </>
        ) : null}
      </div>

      {visible.length > 1 ? (
        <div
          role="group"
          aria-label="Imagens do produto"
          className="flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] md:absolute md:inset-y-0 md:left-0 md:w-16 md:flex-col md:overflow-x-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagem ${i + 1} de ${visible.length}`}
              aria-pressed={i === safeIndex}
              className={cn(
                "relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-md bg-surface-elevated transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                i === safeIndex ? "ring-2 ring-gold" : "opacity-70 ring-1 ring-border hover:opacity-100",
              )}
            >
              <Image src={image.url ?? ""} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? HiChevronLeft : HiChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Imagem anterior" : "Próxima imagem"}
      className={cn(
        "absolute top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card/90 text-foreground shadow-md transition-opacity outline-none hover:bg-card focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover:opacity-100",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
