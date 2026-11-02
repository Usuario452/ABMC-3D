import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { HiOutlineMagnifyingGlass } from "react-icons/hi2"
import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { CatalogPagination } from "@/components/catalog/catalog-pagination"
import { ProductGrid } from "@/components/catalog/product-card"
import { FiltersSkeleton, ProductGridSkeleton } from "@/components/catalog/skeletons"
import { TrackCatalog } from "@/components/catalog/track-catalog"
import { LoadError } from "@/components/shared/load-error"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { buildCatalogHref } from "@/lib/catalog-url"
import { getActiveCategories, getCatalogPage } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { parseCatalogQuery } from "@/lib/validation/schemas"
import type { CatalogQuery } from "@/types/catalog"

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos os produtos da KuboStudio fabricados por impressão 3D. Busque, filtre por categoria e monte seu pedido.",
  alternates: { canonical: "/catalogo" },
}

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="page-container py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Catálogo</h1>
      <p className="mt-2 text-muted-foreground">Encontre produtos por nome, categoria ou preço.</p>
      <div className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-8">
              <FiltersSkeleton />
              <ProductGridSkeleton />
            </div>
          }
        >
          <CatalogContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

async function CatalogContent({ searchParams }: { searchParams: PageProps<"/catalogo">["searchParams"] }) {
  const query = parseCatalogQuery(await searchParams)
  const categories = await load(getActiveCategories)

  if (!categories.ok) return <LoadError result={categories} retryHref={buildCatalogHref(query)} />

  return (
    <div className="space-y-8">
      <CatalogFilters key={query.q} query={query} categories={categories.data} />
      <Suspense key={JSON.stringify(query)} fallback={<ProductGridSkeleton />}>
        <CatalogResults query={query} categoryName={categories.data.find((c) => c.slug === query.category)?.name} />
      </Suspense>
    </div>
  )
}

async function CatalogResults({ query, categoryName }: { query: CatalogQuery; categoryName?: string }) {
  const result = await load(() => getCatalogPage(query))
  if (!result.ok) return <LoadError result={result} retryHref={buildCatalogHref(query)} />

  const { products, total, pageCount } = result.data
  const hasFilters = Boolean(query.q || query.category)
  // Registra a busca com o total de resultados: total 0 = o que a pessoa procurou e não encontrou.
  const tracker = <TrackCatalog query={query.q} category={query.category} results={total} page={query.page} />

  if (products.length === 0) {
    const outOfRange = total > 0 && query.page > pageCount
    return (
      <>
        {tracker}
        <StateMessage
          icon={HiOutlineMagnifyingGlass}
          title={outOfRange ? "Página não encontrada" : hasFilters ? "Nenhum produto encontrado" : "Nenhum produto publicado"}
          description={
            outOfRange
              ? "Esta página do catálogo não existe."
              : hasFilters
                ? "Tente buscar por outro nome ou escolher outra categoria."
                : "Os produtos da KuboStudio serão publicados aqui em breve."
          }
          action={
            hasFilters || outOfRange ? (
              <Button asChild variant="outline">
                <Link href="/catalogo">Ver todo o catálogo</Link>
              </Button>
            ) : undefined
          }
        />
      </>
    )
  }

  return (
    <section aria-label="Resultados">
      {tracker}
      <p className="mb-5 text-sm text-muted-foreground" role="status">
        {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}
        {categoryName ? ` em ${categoryName}` : ""}
        {query.q ? ` para “${query.q}”` : ""}
      </p>
      <ProductGrid products={products} preloadFirst={4} />
      <CatalogPagination query={query} pageCount={pageCount} />
    </section>
  )
}
