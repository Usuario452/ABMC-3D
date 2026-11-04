"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { HiArrowRight, HiArrowUpRight, HiChevronDown, HiMagnifyingGlass, HiOutlineSquares2X2 } from "react-icons/hi2"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { buildCatalogHref, buildCategoryHref } from "@/lib/catalog-url"
import { cn } from "@/lib/utils"
import type { CategorySummary } from "@/types/catalog"

/*
 * Busca e categorias do cabeçalho. As cores vêm de `currentColor` (herdada do cabeçalho), então funcionam
 * igual com o cabeçalho estacionado no hero (branco) e com a barra ativa (cor do tema).
 */

/** Tempo até fechar depois que o mouse sai do botão ou da lista (permite atravessar o espaço entre os dois). */
const CLOSE_DELAY_MS = 150

/**
 * Categorias num popover que abre ao passar o mouse (e no toque, no celular), em grade de duas colunas.
 * O catálogo completo é o último item.
 */
export function HeaderCategories({ categories }: { categories: CategorySummary[] }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  if (categories.length === 0) return null

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  // Só o mouse abre/fecha por hover; no toque, o clique do Radix cuida disso.
  const isMouse = (event: React.PointerEvent) => event.pointerType === "mouse"


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Categorias"
          onPointerEnter={(event) => {
            if (!isMouse(event)) return
            cancelClose()
            setOpen(true)
          }}
          onPointerLeave={(event) => {
            if (isMouse(event)) scheduleClose()
          }}
          className="group inline-flex h-10 cursor-pointer items-center gap-1.5 px-2 text-sm font-medium text-inherit opacity-90 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
        >
          <HiOutlineSquares2X2 className="size-5 md:hidden" aria-hidden />
          <span className="hidden md:inline">Categorias</span>
          <HiChevronDown
            className="hidden size-4 opacity-70 transition-transform group-aria-expanded:rotate-180 md:block"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={8}
        // No celular ocupa a largura da tela (com folga de 8px de cada lado) e fica centralizado.
        collisionPadding={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={(event) => {
          if (isMouse(event)) cancelClose()
        }}
        onPointerLeave={(event) => {
          if (isMouse(event)) scheduleClose()
        }}
        // Mesmo vidro escuro da barra do cabeçalho.
        className={cn(
          "rounded-2xl border border-white/10 bg-[#0a0a0b]/60 p-2 text-white shadow-2xl shadow-black/40 ring-0 backdrop-blur-xl backdrop-saturate-150",
          "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-max sm:max-w-[min(36rem,calc(100vw-2rem))]",
        )}
      >
        {/* Links simples (brancos, dourados ao passar o mouse), com a seta inclinada no fim; o catálogo completo é mais um item da lista. */}
        <ul className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-2 sm:grid-cols-[repeat(2,max-content)] sm:gap-x-4">
          {[
            ...categories.map((category) => ({
              key: category.id,
              href: buildCategoryHref(category.id),
              label: category.name,
            })),
            { key: "todos", href: "/catalogo", label: "Ver todo o catálogo" },
          ].map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="group/link inline-flex max-w-full items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/90 transition-colors outline-none hover:text-primary focus-visible:text-primary"
              >
                <span className="whitespace-nowrap">{item.label}</span>
                <HiArrowUpRight
                  className="size-3.5 shrink-0 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Busca compacta: leva ao catálogo filtrado. No celular, vira um ícone que abre o catálogo. */
export function HeaderSearch() {
  const router = useRouter()
  const [text, setText] = useState("")

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          router.push(buildCatalogHref({ q: text.trim().slice(0, 80) }))
        }}
        className="relative hidden md:block"
      >
        <label htmlFor="header-search" className="sr-only">
          Buscar produtos
        </label>
        <HiMagnifyingGlass
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60"
          aria-hidden
        />
        <input
          id="header-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={80}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Buscar produtos"
          className="h-10 w-56 rounded-full border border-current/15 bg-current/5 pr-11 pl-9 text-sm text-inherit transition-[width,background-color,border-color] outline-none placeholder:text-current/55 focus:w-72 focus:border-current/30 focus:bg-current/10 lg:w-64 [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Setinha para buscar; fica dourada quando há texto. */}
        <button
          type="submit"
          aria-label="Buscar"
          className={cn(
            "absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-current/40",
            text.trim() ? "bg-primary text-primary-foreground hover:bg-gold-light" : "text-current/60 hover:bg-current/10 hover:text-current",
          )}
        >
          <HiArrowRight className="size-4" aria-hidden />
        </button>
      </form>
      <Link
        href="/catalogo"
        aria-label="Buscar produtos"
        className="inline-flex size-10 items-center justify-center rounded-full text-inherit transition-colors outline-none hover:bg-current/10 focus-visible:ring-2 focus-visible:ring-current/40 md:hidden"
      >
        <HiMagnifyingGlass className="size-5" aria-hidden />
      </Link>
    </>
  )
}
