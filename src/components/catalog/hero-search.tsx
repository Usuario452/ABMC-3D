"use client"

import { useRouter } from "next/navigation"
import { useEffect, useId, useState, useTransition } from "react"
import { HiMagnifyingGlass, HiXMark } from "react-icons/hi2"
import { cn } from "@/lib/utils"

// Pausa na digitação antes de buscar sozinho.
const SEARCH_DEBOUNCE_MS = 400

/**
 * Busca de vidro dos heros (catálogo e categoria): filtra a lista abaixo enquanto a pessoa digita (após
 * uma pausa), trocando o ?q= da URL sem rolar a página nem empilhar histórico. Enter busca na hora. Os
 * demais filtros da URL (`baseQuery`) são mantidos; a página volta para a primeira.
 */
export function HeroSearch({
  basePath,
  placeholder,
  initial,
  baseQuery = "",
  className,
}: {
  basePath: string
  placeholder: string
  /** Texto buscado hoje (o ?q= atual). */
  initial: string
  /** Demais parâmetros da URL a manter, sem q e sem página (ex.: "categoria=chaveiros&ordem=preco-asc"). */
  baseQuery?: string
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initial)
  const inputId = useId()

  const go = (term: string) => {
    const params = new URLSearchParams(baseQuery)
    if (term) params.set("q", term)
    const search = params.toString()
    startTransition(() => router.replace(search ? `${basePath}?${search}` : basePath, { scroll: false }))
  }

  useEffect(() => {
    const term = search.trim().slice(0, 80)
    if (term === initial) return
    const timer = setTimeout(() => go(term), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // go só depende de basePath, baseQuery e router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, initial, basePath, baseQuery, router])

  // A busca mudou por fora (voltar, "Limpar busca"): o campo acompanha.
  const [synced, setSynced] = useState(initial)
  if (initial !== synced) {
    setSynced(initial)
    if (initial !== search.trim()) setSearch(initial)
  }

  return (
    <form
      role="search"
      className={cn("relative w-full max-w-lg", className)}
      onSubmit={(event) => {
        event.preventDefault()
        go(search.trim().slice(0, 80))
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <HiMagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-5 z-10 size-5 -translate-y-1/2 text-white/60"
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        maxLength={80}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        aria-busy={isPending}
        className="h-13 w-full rounded-full border border-white/20 bg-white/10 pr-14 pl-13 text-base text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-colors outline-none placeholder:text-white/55 focus:border-white/40 focus:bg-white/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {isPending ? (
        <span
          aria-hidden
          className="absolute top-1/2 right-5 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-gold"
        />
      ) : search ? (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => setSearch("")}
          className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <HiXMark className="size-5" aria-hidden />
        </button>
      ) : null}
    </form>
  )
}
