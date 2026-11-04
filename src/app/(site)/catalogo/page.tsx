import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { HiChevronRight, HiMagnifyingGlass, HiOutlineCubeTransparent } from "react-icons/hi2"
import { HeaderPark } from "@/components/layout/header-park"
import { CatalogBrowser } from "@/components/catalog/catalog-browser"
import { HeroSearch } from "@/components/catalog/hero-search"
import { CatalogBrowserSkeleton } from "@/components/catalog/skeletons"
import { JsonLd } from "@/components/shared/json-ld"
import { LoadError } from "@/components/shared/load-error"
import { buildCatalogHref } from "@/lib/catalog-url"
import { getActiveCategories } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { breadcrumbJsonLd } from "@/lib/seo"
import { parseCatalogQuery } from "@/lib/validation/schemas"

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todos os produtos da KuboStudio fabricados por impressão 3D. Busque, filtre por categoria e preço e monte seu pedido.",
  alternates: { canonical: "/catalogo" },
}

type SearchParams = PageProps<"/catalogo">["searchParams"]

/**
 * Catálogo geral, no padrão da home e das categorias: hero com a foto da oficina desfocada (sob o cabeçalho
 * estacionado), título e a busca de vidro; abaixo, sobre a grade quadriculada, a coluna de filtros, os
 * atalhos, a ordenação e a grade de produtos.
 */
export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: "Catálogo", path: "/catalogo" },
        ])}
      />
      <section
        data-header-park
        className="relative isolate -mt-[4.25rem] overflow-hidden bg-[#0a0907] text-white sm:-mt-20"
      >
        <HeaderPark />
        <Image src="/hero/oficina-3d.webp" alt="" fill priority sizes="100vw" className="-z-20 scale-105 object-cover blur-md" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-black/65" />

        <div className="page-container flex flex-col items-center pt-32 pb-14 text-center sm:pt-36 sm:pb-16">
          <nav aria-label="Trilha de navegação" className="text-xs text-white/60 sm:text-sm">
            <ol className="flex items-center gap-1">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Início
                </Link>
              </li>
              <li aria-hidden>
                <HiChevronRight className="size-3.5" />
              </li>
              <li aria-current="page" className="text-white/85">
                Catálogo
              </li>
            </ol>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <HiOutlineCubeTransparent className="size-4 text-gold-light" aria-hidden />
            <span className="bg-gold-gradient bg-clip-text text-transparent">Catálogo completo</span>
          </p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
            Todos os produtos
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-pretty text-white/70 sm:text-base">
            Encontre peças por nome, categoria ou preço. Tudo fabricado por impressão 3D na nossa oficina.
          </p>
          <Suspense fallback={<HeroSearchFallback />}>
            <CatalogHeroSearch searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      {/* Corpo sobre a grade quadriculada da página. */}
      <div className="relative isolate">
        <div aria-hidden className="bg-grid-page pointer-events-none absolute inset-0 -z-10" />
        <div className="page-container py-10">
          <Suspense fallback={<CatalogBrowserSkeleton />}>
            <CatalogContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

async function CatalogHeroSearch({ searchParams }: { searchParams: SearchParams }) {
  const query = parseCatalogQuery(await searchParams)
  // Mantém os demais filtros ao buscar; a busca em si (q) e a página ficam de fora.
  const baseQuery = buildCatalogHref({ ...query, q: "", page: 1 }).split("?")[1] ?? ""
  return (
    <HeroSearch
      basePath="/catalogo"
      placeholder="O que você procura?"
      initial={query.q}
      baseQuery={baseQuery}
      className="mt-8"
    />
  )
}

/** Campo da busca enquanto os parâmetros da URL chegam (mesmo visual, sem interação). */
function HeroSearchFallback() {
  return (
    <div className="relative mt-8 w-full max-w-lg" aria-hidden>
      <HiMagnifyingGlass className="absolute top-1/2 left-5 size-5 -translate-y-1/2 text-white/60" />
      <div className="flex h-13 w-full items-center rounded-full border border-white/20 bg-white/10 pl-13 text-base text-white/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
        O que você procura?
      </div>
    </div>
  )
}

async function CatalogContent({ searchParams }: { searchParams: SearchParams }) {
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
