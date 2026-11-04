"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2"
import { cn } from "@/lib/utils"

/**
 * Trilho horizontal da home (categorias, destaques): rola com o dedo/trackpad (com encaixe) e pelas setas
 * nas extremidades (desktop); as pontas esmaecem onde ainda há itens escondidos. Os filhos são os <li>.
 */
export function ScrollRow({ label, children }: { label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () =>
      setEdges({
        start: track.scrollLeft <= 4,
        end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
      })
    update()
    track.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      track.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  // Avança cerca de uma "página" de itens por clique.
  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    // Sangra até a borda da página (pela margem lateral do contêiner); os itens seguem alinhados ao conteúdo.
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-10">
      <ArrowButton
        label={`${label}: anteriores`}
        hidden={edges.start}
        onClick={() => scroll(-1)}
        className="left-0 sm:left-1 lg:left-2"
      >
        <HiChevronLeft className="size-7" aria-hidden />
      </ArrowButton>
      <ArrowButton
        label={`${label}: próximos`}
        hidden={edges.end}
        onClick={() => scroll(1)}
        className="right-0 sm:right-1 lg:right-2"
      >
        <HiChevronRight className="size-7" aria-hidden />
      </ArrowButton>

      <ul
        ref={trackRef}
        aria-label={label}
        // Do tablet para cima, esmaece suave ao longo da margem (onde há itens escondidos). No celular não: a
        // máscara cobriria boa parte da tela; lá o trilho vai até a borda e o card cortado indica que rola.
        style={{ "--row-mask": `linear-gradient(to right, ${fade(edges.start, "left")}, ${fade(edges.end, "right")})` } as CSSProperties}
        className="flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:scroll-px-6 sm:gap-1.5 sm:px-6 sm:[mask-image:var(--row-mask)] lg:scroll-px-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </div>
  )
}

/** Paradas do degradê da máscara numa ponta: aberta (sem cards escondidos) ou esmaecendo ao longo de 96px. */
function fade(atEdge: boolean, side: "left" | "right") {
  if (atEdge) return side === "left" ? "black 0" : "black 100%"
  const stops = [
    [0, 0],
    [24, 0.25],
    [56, 0.7],
    [96, 1],
  ] as const
  // Na direita, as mesmas paradas espelhadas e em ordem crescente de posição.
  const ordered = side === "left" ? stops : [...stops].reverse()
  return ordered
    .map(([px, alpha]) => `rgb(0 0 0 / ${alpha}) ${side === "left" ? `${px}px` : `calc(100% - ${px}px)`}`)
    .join(", ")
}

function ArrowButton({
  label,
  hidden,
  onClick,
  className,
  children,
}: {
  label: string
  hidden: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 hidden h-12 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-[opacity,color] outline-none hover:text-gold focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-ring sm:flex",
        hidden && "pointer-events-none opacity-0",
        className,
      )}
    >
      {children}
    </button>
  )
}
