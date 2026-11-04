"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition, type ReactNode } from "react"
import { HiMagnifyingGlass } from "react-icons/hi2"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildCatalogHref } from "@/lib/catalog-url"
import { cn } from "@/lib/utils"
import { CATALOG_SORTS, type CatalogQuery, type CatalogSort } from "@/types/catalog"

// Pausa na digitação antes de buscar sozinho.
const SEARCH_DEBOUNCE_MS = 400

/**
 * Barra de cima do catálogo: busca pelo nome, ordenação e (nas telas menores) o botão que abre os filtros.
 * Os demais filtros ficam na coluna lateral (CatalogSidebar).
 */
export function CatalogFilters({
  query,
  filtersButton,
}: {
  query: CatalogQuery
  /** Botão "Filtros" das telas menores (some no lg, onde a coluna lateral aparece). */
  filtersButton?: ReactNode
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(query.q)

  // Qualquer mudança de filtro volta para a primeira página.
  const hrefFor = (next: Partial<CatalogQuery>) => buildCatalogHref({ ...query, ...next, page: 1 })

  const navigate = (next: Partial<CatalogQuery>) => {
    startTransition(() => router.push(hrefFor(next), { scroll: false }))
  }

  // Busca enquanto digita (após a pausa); troca a URL sem empilhar uma entrada por tecla no histórico.
  useEffect(() => {
    const term = search.trim().slice(0, 80)
    if (term === query.q) return
    const timer = setTimeout(() => {
      startTransition(() => router.replace(hrefFor({ q: term }), { scroll: false }))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // hrefFor só depende de query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query, router])

  // A busca mudou por fora (cabeçalho, "Limpar filtros", voltar): o campo acompanha.
  const [syncedQ, setSyncedQ] = useState(query.q)
  if (query.q !== syncedQ) {
    setSyncedQ(query.q)
    if (query.q !== search.trim()) setSearch(query.q)
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 transition-opacity sm:flex-nowrap", isPending && "opacity-70")}
      aria-busy={isPending}
    >
      <form
        role="search"
        className="relative w-full sm:flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ q: search.trim().slice(0, 80) })
        }}
      >
        <Label htmlFor="catalog-search" className="sr-only">
          Buscar produtos pelo nome
        </Label>
        <HiMagnifyingGlass
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="catalog-search"
          type="search"
          enterKeyHint="search"
          maxLength={80}
          placeholder="Buscar produtos"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 pr-3 pl-10"
        />
      </form>

      {filtersButton}

      <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
        <Label htmlFor="catalog-sort" className="sr-only">
          Ordenar produtos
        </Label>
        <Select value={query.sort} onValueChange={(value) => navigate({ sort: value as CatalogSort })}>
          <SelectTrigger id="catalog-sort" className="w-full data-[size=default]:h-10">
            <span className="text-muted-foreground">Ordenar:</span>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(CATALOG_SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
