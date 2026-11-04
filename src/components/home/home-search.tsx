"use client"

import Link from "next/link"
import { createContext, use, useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { HiArrowRight, HiMagnifyingGlass, HiOutlineMagnifyingGlass, HiXMark } from "react-icons/hi2"
import { searchProducts, type HomeSearchResult } from "@/actions/search"
import { ProductGrid } from "@/components/catalog/product-card"
import { ProductGridSkeleton } from "@/components/catalog/skeletons"
import { TrackCatalog } from "@/components/catalog/track-catalog"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { buildCatalogHref } from "@/lib/catalog-url"

/**
 * Busca da home. O texto fica num contexto compartilhado entre o campo (no hero) e a área de baixo:
 * com texto, as seções da home somem e aparecem os produtos encontrados; sem texto, tudo volta.
 * O termo vai para a URL (?busca=) sem recarregar, para o link e o "voltar" funcionarem.
 */

const PARAM = "busca"
const DEBOUNCE_MS = 300

type SearchState = {
  text: string
  setText: (text: string) => void
  /** Termo já "assentado" (após a pausa na digitação), o que de fato foi buscado. */
  term: string
  result: HomeSearchResult | null
  pending: boolean
}

const SearchContext = createContext<SearchState | null>(null)

function useHomeSearch() {
  const context = use(SearchContext)
  if (!context) throw new Error("useHomeSearch fora do HomeSearchProvider")
  return context
}

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("")
  const [term, setTerm] = useState("")
  const [result, setResult] = useState<HomeSearchResult | null>(null)
  const [pending, startTransition] = useTransition()
  const latest = useRef(0)

  // Busca vinda do link (?busca=): lida só no navegador, depois da hidratação (o HTML da home é estático).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get(PARAM)
    if (initial) queueMicrotask(() => setText(initial))
  }, [])

  useEffect(() => {
    const value = text.trim().slice(0, 80)
    const timer = window.setTimeout(() => {
      // URL sem recarregar a página.
      const url = new URL(window.location.href)
      if (value) url.searchParams.set(PARAM, value)
      else url.searchParams.delete(PARAM)
      window.history.replaceState(window.history.state, "", url)

      setTerm(value)
      if (!value) {
        setResult(null)
        return
      }
      const request = ++latest.current
      startTransition(async () => {
        const next = await searchProducts(value).catch((): HomeSearchResult => ({ ok: false }))
        // Só a resposta da última busca vale; as antigas chegam depois e são ignoradas.
        if (request === latest.current) setResult(next)
      })
    }, value ? DEBOUNCE_MS : 0)
    return () => window.clearTimeout(timer)
  }, [text])

  return <SearchContext value={{ text, setText, term, result, pending }}>{children}</SearchContext>
}

/** Campo de busca grande do hero. */
export function HomeSearchInput() {
  const { text, setText } = useHomeSearch()

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" })
      }}
      className="relative mx-auto w-full max-w-xl"
    >
      <label htmlFor="home-search" className="sr-only">
        Buscar produtos
      </label>
      <HiMagnifyingGlass
        className="pointer-events-none absolute top-1/2 left-5 z-10 size-5 -translate-y-1/2 text-white/60"
        aria-hidden
      />
      <input
        id="home-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={80}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="O que você procura?"
        className="h-14 w-full rounded-full border border-white/20 bg-white/10 pr-32 pl-13 text-base text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-colors outline-none placeholder:text-white/55 focus:border-white/40 focus:bg-white/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-28 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <HiXMark className="size-5" aria-hidden />
        </button>
      ) : null}
      <Button type="submit" className="absolute top-1/2 right-2 h-10 -translate-y-1/2 rounded-full px-5">
        Buscar
      </Button>
    </form>
  )
}

/**
 * Área abaixo do hero: as seções da home (children) ou, com busca, os produtos encontrados.
 */
export function HomeSearchArea({ children }: { children: ReactNode }) {
  const { text, term, result, pending } = useHomeSearch()
  const searching = text.trim().length > 0

  if (!searching) return <>{children}</>

  const waiting = pending || term !== text.trim().slice(0, 80) || result === null

  return (
    <section id="resultados" className="page-container scroll-mt-24 py-10" aria-live="polite" aria-busy={waiting}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Resultados para “{text.trim()}”</h2>
          {!waiting && result?.ok ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {result.total === 1 ? "1 produto encontrado" : `${result.total} produtos encontrados`}
            </p>
          ) : null}
        </div>
        {!waiting && result?.ok && result.total > result.products.length ? (
          <Link
            href={buildCatalogHref({ q: term })}
            className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            Ver todos no catálogo
            <HiArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      {waiting ? (
        <ProductGridSkeleton count={5} />
      ) : !result?.ok ? (
        <StateMessage
          role="alert"
          icon={HiOutlineMagnifyingGlass}
          title="Não foi possível buscar agora"
          description="Tente de novo em instantes."
        />
      ) : (
        <>
          <TrackCatalog query={term} category={undefined} results={result.total} page={1} />
          {result.products.length > 0 ? (
            <ProductGrid products={result.products} />
          ) : (
            <StateMessage
              icon={HiOutlineMagnifyingGlass}
              title="Nenhum produto encontrado"
              description="Tente outro termo ou peça um projeto sob medida pelo WhatsApp."
            />
          )}
        </>
      )}
    </section>
  )
}
