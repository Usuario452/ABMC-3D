"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { HiChevronDown } from "react-icons/hi2"
import { cn } from "@/lib/utils"

/**
 * Conteúdo recolhido numa altura máxima, com um esmaecido embaixo e o botão "Ler mais"; o botão só aparece
 * quando o conteúdo passa dessa altura. Aberto, mostra tudo e o botão vira "Ler menos".
 */
export function Expandable({
  children,
  collapsedHeight = 128,
  className,
}: {
  children: ReactNode
  /** Altura recolhida, em px. */
  collapsedHeight?: number
  className?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const measure = () => setOverflows(content.scrollHeight > collapsedHeight + 24)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [collapsedHeight])

  const collapsed = overflows && !open

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={contentRef}
          style={collapsed ? { maxHeight: collapsedHeight } : undefined}
          className={cn(collapsed && "overflow-hidden")}
        >
          {children}
        </div>
        {collapsed ? (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent to-background" />
        ) : null}
      </div>
      {overflows ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-gold hover:underline"
        >
          {open ? "Ler menos" : "Ler mais"}
          <HiChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
