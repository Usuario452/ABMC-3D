import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { FaWhatsapp } from "react-icons/fa6"
import {
  HiArrowLeft,
  HiChevronRight,
  HiMagnifyingGlass,
  HiOutlineCubeTransparent,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiXMark,
} from "react-icons/hi2"
import { CatalogEmpty } from "@/components/catalog/catalog-empty"
import { CatalogPagination } from "@/components/catalog/catalog-pagination"
import { CategorySearch } from "@/components/catalog/category-search"
import { ProductGrid } from "@/components/catalog/product-card"
import { ProductGridSkeleton } from "@/components/catalog/skeletons"
import { TrackCatalog } from "@/components/catalog/track-catalog"
import { CustomOrderStrip } from "@/components/home/custom-order-card"
import { FeaturedSection, FeaturedSkeleton } from "@/components/home/featured-section"
import { LoadError } from "@/components/shared/load-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { buildCatalogHref, buildCategoryHref } from "@/lib/catalog-url"
import { getCatalogPage, getCategoryById, type CategoryShowcase } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { isDatabaseConfigured } from "@/lib/env"
import { parseCatalogQuery, uuidSchema } from "@/lib/validation/schemas"
import { getWhatsAppContactUrl } from "@/lib/whatsapp"
import type { CatalogQuery } from "@/types/catalog"

type Props = PageProps<"/categorias/[id]">

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!uuidSchema.safeParse(id).success || !isDatabaseConfigured()) return { title: "Categoria" }

  const result = await getCategoryById(id)
  if (!result.ok) return { title: "Categoria" }
  const category = result.data
  if (!category) return { title: "Categoria não encontrada", robots: { index: false } }

  const description = category.description || siteConfig.seo.description
  return {
    title: category.name,
    description,
    alternates: { canonical: buildCategoryHref(category.id) },
    openGraph: { title: category.name, description },
  }
}

/**
 * Página de uma categoria: topo com foto de fundo, capa, nome e descrição e,
 * abaixo, os produtos da categoria (com paginação), a faixa de pedidos sob medida e os destaques da loja. Os filtros ficam no catálogo geral.
 */
export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function CategoryContent({ params, searchParams }: Props) {
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const result = await load(() => getCategoryById(id))
  if (!result.ok) {
    return (
      <div className="page-container py-10">
        <LoadError result={result} retryHref={buildCategoryHref(id)} />
      </div>
    )
  }
  const category = result.data
  if (!category) notFound()

  // A categoria vem do caminho; da URL valem só a busca do topo e a página (os filtros ficam no catálogo geral).
  const { pagina, q } = await searchParams
  const query: CatalogQuery = { ...parseCatalogQuery({ pagina, q }), category: category.slug }

  return (
    <>
      <CategoryHero category={category} search={query.q} />
      {/* Tudo abaixo do topo fica sobre a grade quadriculada da página. */}
      <div className="relative isolate">
        <div aria-hidden className="bg-grid-page pointer-events-none absolute inset-0 -z-10" />
        <div className="page-container py-10">
          <Suspense key={`${query.q}|${query.page}`} fallback={<ProductGridSkeleton />}>
            <CategoryProducts query={query} category={category} />
          </Suspense>
        </div>
        <CustomOrderStrip className="pt-2" />
        <Suspense fallback={<FeaturedSkeleton className="pt-12 pb-16" />}>
          <FeaturedSection className="pt-12 pb-16" showCatalogLink={false} />
        </Suspense>
      </div>
    </>
  )
}

/** Produtos da categoria em grade, com paginação; sem produtos, um estado vazio com saídas. */
async function CategoryProducts({ query, category }: { query: CatalogQuery; category: CategoryShowcase }) {
  const basePath = buildCategoryHref(category.id)
  const result = await load(() => getCatalogPage(query))
  if (!result.ok) return <LoadError result={result} retryHref={basePath} />

  const { products, total, pageCount } = result.data
  const tracker = <TrackCatalog query={query.q} category={query.category} results={total} page={query.page} />

  if (products.length === 0 && query.q && !(total > 0 && query.page > pageCount)) {
    return (
      <>
        {tracker}
        <CatalogEmpty
          icon={HiOutlineMagnifyingGlass}
          badge={HiXMark}
          title="Nada encontrado"
          description={`Nenhum produto de ${category.name} com “${query.q}”. Tente outro nome.`}
          actions={
            <>
              <Button asChild>
                <Link href={buildCatalogHref({ q: query.q })}>
                  <HiMagnifyingGlass aria-hidden />
                  Buscar em todo o catálogo
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={basePath} scroll={false}>
                  <HiOutlineSquares2X2 aria-hidden />
                  Ver toda a categoria
                </Link>
              </Button>
            </>
          }
        />
      </>
    )
  }

  if (products.length === 0) {
    const outOfRange = total > 0 && query.page > pageCount
    const contactUrl = getWhatsAppContactUrl()
    return (
      <>
        {tracker}
        <CatalogEmpty
          icon={HiOutlineCubeTransparent}
          badge={outOfRange ? HiXMark : HiOutlineSparkles}
          title={outOfRange ? "Página não encontrada" : "Em breve por aqui"}
          description={
            outOfRange
              ? "Esta página da categoria não existe mais."
              : `As peças de ${category.name} ainda estão saindo da impressora. Enquanto isso, veja outros produtos ou peça algo sob medida.`
          }
          actions={
            outOfRange ? (
              <Button asChild>
                <Link href={basePath}>
                  <HiArrowLeft aria-hidden />
                  Voltar para a primeira página
                </Link>
              </Button>
            ) : (
              <>
                {contactUrl ? (
                  <Button asChild>
                    <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                      <FaWhatsapp aria-hidden />
                      Pedir sob medida
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/catalogo">
                    <HiOutlineSquares2X2 aria-hidden />
                    Ver todo o catálogo
                  </Link>
                </Button>
              </>
            )
          }
        />
      </>
    )
  }

  return (
    <section aria-label={`Produtos de ${category.name}`}>
      {tracker}
      {query.q ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-medium" role="status">
            {total} {total === 1 ? "resultado" : "resultados"} para “{query.q}”
          </p>
          <Link href={basePath} scroll={false} className="text-xs font-medium text-gold hover:underline">
            Limpar busca
          </Link>
        </div>
      ) : null}
      <ProductGrid products={products} preloadFirst={4} />
      <CatalogPagination query={{ ...query, category: "" }} pageCount={pageCount} basePath={basePath} />
    </section>
  )
}

/**
 * Topo da categoria: a foto da oficina (a mesma do hero da home) de ponta a ponta, desfocada e sob um véu escuro,
 * e por cima, à esquerda, a capa inteira em retrato (4:5) num card
 * arredondado, com nome, descrição e a busca da categoria ao lado (embaixo, no celular). Sobe por baixo do cabeçalho estacionado.
 */
function CategoryHero({ category, search }: { category: CategoryShowcase; search: string }) {

  return (
    <section
      data-header-park
      className="relative isolate -mt-[4.25rem] overflow-hidden bg-[#0a0907] text-white sm:-mt-20"
    >
      <Image src="/hero/oficina-3d.webp" alt="" fill priority sizes="100vw" className="-z-20 scale-105 object-cover blur-md" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-black/85 via-black/65 to-black/35" />

      <div className="page-container flex flex-col gap-7 pt-28 pb-12 sm:pt-32 lg:flex-row lg:items-center lg:gap-14 lg:pt-36 lg:pb-20">
        {category.coverUrl ? (
          <div className="relative aspect-[4/5] w-40 shrink-0 overflow-hidden rounded-3xl bg-white/5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/15 sm:w-56 lg:w-[300px] xl:w-[340px]">
            <Image
              src={category.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 340px, (min-width: 1024px) 300px, (min-width: 640px) 224px, 160px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <nav aria-label="Trilha de navegação" className="text-xs text-white/60 sm:text-sm">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Início
                </Link>
              </li>
              <li aria-hidden>
                <HiChevronRight className="size-3.5" />
              </li>
              <li>
                <Link href="/catalogo" className="transition-colors hover:text-white">
                  Catálogo
                </Link>
              </li>
            </ol>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <HiOutlineCubeTransparent className="size-4 text-gold-light" aria-hidden />
            <span className="bg-gold-gradient bg-clip-text text-transparent">Categoria</span>
          </p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-pretty text-white/75 sm:text-base">
              {category.description}
            </p>
          ) : null}
          {/* Busca dentro da categoria: a lista abaixo filtra enquanto a pessoa digita. */}
          <CategorySearch basePath={buildCategoryHref(category.id)} categoryName={category.name} initial={search} />
        </div>
      </div>
    </section>
  )
}

function CategoryPageSkeleton() {
  return (
    <>
      <div className="-mt-[4.25rem] bg-[#0a0907] sm:-mt-20" aria-hidden>
        <div className="page-container flex flex-col gap-7 pt-28 pb-12 sm:pt-32 lg:flex-row lg:items-center lg:gap-14 lg:pt-36 lg:pb-20">
          <Skeleton className="aspect-[4/5] w-40 shrink-0 rounded-3xl bg-white/10 sm:w-56 lg:w-[300px] xl:w-[340px]" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="mt-5 h-3 w-24 bg-white/10" />
            <Skeleton className="mt-4 h-12 w-72 max-w-full bg-white/10" />
            <Skeleton className="mt-4 h-4 w-96 max-w-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="page-container py-10">
        <ProductGridSkeleton />
      </div>
    </>
  )
}
