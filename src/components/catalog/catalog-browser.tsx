import Link from "next/link"
import { Suspense } from "react"
import { FaWhatsapp } from "react-icons/fa6"
import {
  HiArrowLeft,
  HiArrowPath,
  HiOutlineCubeTransparent,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiXMark,
} from "react-icons/hi2"
import { CatalogEmpty } from "@/components/catalog/catalog-empty"
import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { CatalogPagination } from "@/components/catalog/catalog-pagination"
import { CatalogSidebar } from "@/components/catalog/catalog-sidebar"
import { FiltersSheet } from "@/components/catalog/filters-sheet"
import { GRID_WITH_SIDEBAR, ProductGrid } from "@/components/catalog/product-card"
import { QuickFilters, QuickFiltersSkeleton } from "@/components/catalog/quick-filters"
import { ProductGridSkeleton, SidebarSkeleton } from "@/components/catalog/skeletons"
import { TrackCatalog } from "@/components/catalog/track-catalog"
import { LoadError } from "@/components/shared/load-error"
import { Button } from "@/components/ui/button"
import { countActiveFilters, priceRangeLabel } from "@/lib/catalog-filters"
import { buildCatalogHref } from "@/lib/catalog-url"
import { getCatalogFacets, getCatalogPage } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { getWhatsAppContactUrl } from "@/lib/whatsapp"
import type { CatalogQuery } from "@/types/catalog"

type BrowserProps = {
  query: CatalogQuery
  /** Nome da categoria filtrada, para o chip de filtro ativo. */
  categoryLabel?: string
}

/**
 * Catálogo geral com filtros no estilo do Mercado Livre: coluna de filtros à esquerda (gaveta no celular),
 * busca e ordenação em cima, atalhos rápidos (categorias, destaques, novidades), contagem com os filtros
 * ativos em chips e a grade de produtos.
 */
export function CatalogBrowser({ query, categoryLabel }: BrowserProps) {
  // As contagens não dependem de página nem de ordem; só recarregam quando um filtro muda.
  const facetKey = buildCatalogHref({ ...query, page: 1, sort: "nome-asc" })
  const sidebar = (
    <Suspense key={facetKey} fallback={<SidebarSkeleton />}>
      <SidebarLoader query={query} />
    </Suspense>
  )

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside aria-label="Filtros" className="hidden lg:block">
        <div className="sticky top-24">{sidebar}</div>
      </aside>

      <div className="min-w-0 space-y-5">
        <CatalogFilters
          query={query}
          filtersButton={<FiltersSheet activeCount={countActiveFilters(query)}>{sidebar}</FiltersSheet>}
        />
        <Suspense key={facetKey} fallback={<QuickFiltersSkeleton />}>
          <QuickFiltersLoader query={query} />
        </Suspense>
        <Suspense key={JSON.stringify(query)} fallback={<ProductGridSkeleton columns={GRID_WITH_SIDEBAR} />}>
          <Results query={query} categoryLabel={categoryLabel} />
        </Suspense>
      </div>
    </div>
  )
}

async function SidebarLoader({ query }: { query: CatalogQuery }) {
  const result = await load(() => getCatalogFacets(query))
  // Sem as contagens a coluna some; a listagem ao lado continua funcionando.
  if (!result.ok) return null
  return <CatalogSidebar query={query} facets={result.data} />
}

async function QuickFiltersLoader({ query }: { query: CatalogQuery }) {
  const result = await load(() => getCatalogFacets(query))
  if (!result.ok) return null
  return <QuickFilters query={query} facets={result.data} />
}

async function Results({ query, categoryLabel }: BrowserProps) {
  const href = (next: Partial<CatalogQuery>) => buildCatalogHref({ ...query, ...next, page: 1 })

  const result = await load(() => getCatalogPage(query))
  if (!result.ok) return <LoadError result={result} retryHref={href({})} />

  const { products, total, pageCount } = result.data
  const tracker = <TrackCatalog query={query.q} category={query.category} results={total} page={query.page} />

  // Filtros ativos como chips removíveis.
  const chips: { label: string; href: string }[] = []
  if (query.q) chips.push({ label: `“${query.q}”`, href: href({ q: "" }) })
  if (query.category) chips.push({ label: categoryLabel ?? query.category, href: href({ category: "" }) })
  if (query.minPrice !== null || query.maxPrice !== null)
    chips.push({ label: priceRangeLabel(query.minPrice, query.maxPrice), href: href({ minPrice: null, maxPrice: null }) })
  if (query.featured) chips.push({ label: "Destaques", href: href({ featured: false }) })
  if (query.recent) chips.push({ label: "Novidades", href: href({ recent: false }) })

  if (products.length === 0) {
    const outOfRange = total > 0 && query.page > pageCount
    if (outOfRange) {
      return (
        <>
          {tracker}
          <CatalogEmpty
            icon={HiOutlineMagnifyingGlass}
            badge={HiXMark}
            title="Página não encontrada"
            description="Esta página do catálogo não existe mais."
            actions={
              <Button asChild>
                <Link href={href({})}>
                  <HiArrowLeft aria-hidden />
                  Voltar para a primeira página
                </Link>
              </Button>
            }
          />
        </>
      )
    }

    if (chips.length > 0) {
      return (
        <>
          {tracker}
          <CatalogEmpty
            icon={HiOutlineFunnel}
            badge={HiXMark}
            title="Nada com esses filtros"
            description="Nenhum produto combina com tudo o que você escolheu. Tire algum filtro ou tente outro nome."
            actions={
              <>
                <FilterChips chips={chips} />
                <div className="basis-full" />
                <Button asChild>
                  <Link href="/catalogo">
                    <HiArrowPath aria-hidden />
                    Limpar filtros
                  </Link>
                </Button>
              </>
            }
          />
        </>
      )
    }

    const contactUrl = getWhatsAppContactUrl()
    return (
      <>
        {tracker}
        <CatalogEmpty
          icon={HiOutlineCubeTransparent}
          badge={HiOutlineSparkles}
          title="Catálogo em preparação"
          description="Os produtos da KuboStudio serão publicados aqui em breve. Enquanto isso, peça algo sob medida."
          actions={
            contactUrl ? (
              <Button asChild>
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden />
                  Pedir sob medida
                </a>
              </Button>
            ) : undefined
          }
        />
      </>
    )
  }

  return (
    <section aria-label="Produtos" className="space-y-5">
      {tracker}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-medium" role="status">
          {total} {total === 1 ? "resultado" : "resultados"}
        </p>
        {chips.length > 0 ? (
          <>
            <FilterChips chips={chips} />
            <Link href="/catalogo" className="text-xs font-medium text-gold hover:underline">
              Limpar tudo
            </Link>
          </>
        ) : null}
      </div>
      <ProductGrid products={products} preloadFirst={4} columns={GRID_WITH_SIDEBAR} />
      <CatalogPagination query={query} pageCount={pageCount} />
    </section>
  )
}

function FilterChips({ chips }: { chips: { label: string; href: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Filtros aplicados">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            scroll={false}
            aria-label={`Remover filtro ${chip.label}`}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card pr-2 pl-3 text-xs font-medium transition-colors hover:border-gold/60 hover:text-foreground"
          >
            {chip.label}
            <HiXMark className="size-3.5 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}
