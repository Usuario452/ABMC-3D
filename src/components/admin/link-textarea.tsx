"use client"

import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** Links http(s) do texto, sem a pontuação que costuma vir colada no fim ("veja https://x.com."). */
export function findLinks(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/g)].map((match) => {
    const url = match[0].replace(/[.,;:!?)\]]+$/, "")
    return { url, start: match.index, end: match.index + url.length }
  })
}

/**
 * Campo de texto em que os links abrem com Ctrl+clique (⌘+clique no Mac), como num editor de Markdown.
 * O link fica com a cor do texto; ao passar o mouse ganha sublinhado e, com Ctrl/⌘ pressionado, o cursor
 * de mão e o destaque de ação. O texto do campo fica transparente (o cursor e a seleção continuam
 * visíveis) e uma camada idêntica por cima, sem receber cliques, desenha o texto e os links.
 */
export function LinkTextarea({
  text,
  className,
  onScroll,
  onClick,
  onMouseMove,
  onMouseLeave,
  ...props
}: ComponentProps<typeof Textarea> & {
  /** Conteúdo atual do campo (o campo pode ser não controlado, como no react-hook-form). */
  text: string
}) {
  const mirror = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [modifier, setModifier] = useState(false)
  const links = findLinks(text)

  // Ctrl/⌘ pressionado ou solto sem mexer o mouse também atualiza o destaque.
  useEffect(() => {
    const update = (event: KeyboardEvent) => setModifier(event.ctrlKey || event.metaKey)
    const reset = () => setModifier(false)
    window.addEventListener("keydown", update)
    window.addEventListener("keyup", update)
    window.addEventListener("blur", reset)
    return () => {
      window.removeEventListener("keydown", update)
      window.removeEventListener("keyup", update)
      window.removeEventListener("blur", reset)
    }
  }, [])

  /** Índice do link sob o mouse, pela posição dos trechos de link desenhados no espelho. */
  const linkAt = (event: MouseEvent) => {
    const spans = mirror.current?.querySelectorAll<HTMLElement>("[data-link]") ?? []
    for (const span of spans) {
      for (const rect of span.getClientRects()) {
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          return Number(span.dataset.link)
        }
      }
    }
    return null
  }

  const parts: { text: string; link?: number }[] = []
  let cursor = 0
  links.forEach((link, index) => {
    if (link.start > cursor) parts.push({ text: text.slice(cursor, link.start) })
    parts.push({ text: text.slice(link.start, link.end), link: index })
    cursor = link.end
  })
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })

  const active = hovered !== null && modifier

  return (
    <div className="relative">
      <Textarea
        {...props}
        title={links.length > 0 ? "Ctrl + clique (⌘ + clique no Mac) abre o link" : props.title}
        className={cn("text-transparent caret-foreground selection:bg-gold/25", active && "cursor-pointer", className)}
        onScroll={(event) => {
          if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop
          onScroll?.(event)
        }}
        onMouseMove={(event) => {
          setHovered(linkAt(event))
          setModifier(event.ctrlKey || event.metaKey)
          onMouseMove?.(event)
        }}
        onMouseLeave={(event) => {
          setHovered(null)
          onMouseLeave?.(event)
        }}
        onClick={(event) => {
          onClick?.(event)
          if (!(event.ctrlKey || event.metaKey)) return
          const index = linkAt(event)
          if (index === null) return
          event.preventDefault()
          window.open(links[index].url, "_blank", "noopener,noreferrer")
        }}
      />
      {/* Mesmas medidas do Textarea (borda, espaçamento, fonte), para as letras ficarem na mesma posição. */}
      <div
        ref={mirror}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-2.5 py-2 text-base break-words whitespace-pre-wrap text-foreground md:text-sm"
      >
        {parts.map((part, index) =>
          part.link !== undefined ? (
            <span
              key={index}
              data-link={part.link}
              className={cn(
                "underline-offset-2 transition-colors",
                hovered === part.link && (modifier ? "text-gold underline decoration-gold" : "underline decoration-foreground/40"),
              )}
            >
              {part.text}
            </span>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
        {/* Uma quebra de linha no fim do campo também ocupa espaço no espelho. */}
        {text.endsWith("\n") ? " " : null}
      </div>
    </div>
  )
}
