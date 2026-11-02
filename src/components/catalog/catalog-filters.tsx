"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { HiMagnifyingGlass, HiXMark } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildCatalogHref } from "@/lib/catalog-url"
import { cn } from "@/lib/utils"
import { CATALOG_SORTS, type CatalogQuery, type CatalogSort, type CategorySummary } from "@/types/catalog"

const ALL = "todas"

export function CatalogFilters({ query, categories }: { query: CatalogQuery; categories: CategorySummary[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(query.q)

  const navigate = (next: Partial<CatalogQuery>) => {
    // Qualquer mudança de filtro volta para a primeira página.
    startTransition(() => router.push(buildCatalogHref({ ...query, ...next, page: 1 }), { scroll: false }))
  }

  const hasFilters = Boolean(query.q || query.category || query.sort !== "nome-asc")

  return (
    <div className={cn("space-y-3 transition-opacity", isPending && "opacity-70")} aria-busy={isPending}>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <form
          role="search"
          className="relative"
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
            className="h-10 pr-24 pl-10"
          />
          <Button type="submit" size="sm" className="absolute top-1/2 right-1 -translate-y-1/2">
            Buscar
          </Button>
        </form>

        <div>
          <Label htmlFor="catalog-category" className="sr-only">
            Filtrar por categoria
          </Label>
          <Select value={query.category || ALL} onValueChange={(value) => navigate({ category: value === ALL ? "" : value })}>
            <SelectTrigger id="catalog-category" className="h-10 w-full">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="catalog-sort" className="sr-only">
            Ordenar produtos
          </Label>
          <Select value={query.sort} onValueChange={(value) => navigate({ sort: value as CatalogSort })}>
            <SelectTrigger id="catalog-sort" className="h-10 w-full">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATALOG_SORTS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("")
            startTransition(() => router.push("/catalogo", { scroll: false }))
          }}
        >
          <HiXMark aria-hidden />
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}
