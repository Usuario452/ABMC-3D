import type { Metadata } from "next"
import { Suspense } from "react"
import { CatalogBrowser } from "@/components/catalog/catalog-browser"
import { CatalogBrowserSkeleton } from "@/components/catalog/skeletons"
import { LoadError } from "@/components/shared/load-error"
import { buildCatalogHref } from "@/lib/catalog-url"
import { getActiveCategories } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { parseCatalogQuery } from "@/lib/validation/schemas"

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos os produtos da KuboStudio fabricados por impressão 3D. Busque, filtre por categoria e preço e monte seu pedido.",
  alternates: { canonical: "/catalogo" },
}

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="page-container py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Catálogo</h1>
      <p className="mt-2 text-muted-foreground">Encontre produtos por nome, categoria ou preço.</p>
      <div className="mt-8">
        <Suspense fallback={<CatalogBrowserSkeleton />}>
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
    <CatalogBrowser
      query={query}
      categoryLabel={categories.data.find((category) => category.slug === query.category)?.name}
    />
  )
}
