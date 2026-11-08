import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { FaWhatsapp } from "react-icons/fa6"
import { HiArrowRight, HiOutlineCubeTransparent, HiOutlineSquares2X2 } from "react-icons/hi2"
import { HeaderPark } from "@/components/layout/header-park"
import { PreviewCartProducts } from "@/components/cart/preview-cart-products"
import { AllProducts } from "@/components/home/all-products"
import { CategoriesCarousel } from "@/components/home/categories-carousel"
import { CustomOrderCard } from "@/components/home/custom-order-card"
import { FeaturedSection, FeaturedSkeleton } from "@/components/home/featured-section"
import { HeroVideo } from "@/components/home/hero-video"
import { ChristmasScene } from "@/components/home/christmas-scene"
import { HomeSearchArea, HomeSearchInput, HomeSearchProvider } from "@/components/home/home-search"
import { ProductGridSkeleton } from "@/components/catalog/skeletons"
import { JsonLd } from "@/components/shared/json-ld"
import { LoadError } from "@/components/shared/load-error"
import { StateMessage } from "@/components/shared/state-message"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { getCatalogPage, getShowcaseCategories } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { parseCatalogQuery } from "@/lib/validation/schemas"
import { siteJsonLd } from "@/lib/seo"
import { isChristmasPreview } from "@/lib/christmas-preview"
import { getWhatsAppContactUrl } from "@/lib/whatsapp"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function HomePage() {
  const { texts } = siteConfig
  const contactUrl = getWhatsAppContactUrl()
  const christmas = isChristmasPreview()

  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <HomeSearchProvider>
        {/* Hero de ponta a ponta, centralizado, com a busca; sobe por baixo do cabeçalho estacionado. */}
        <section
          data-header-park
          className="relative isolate -mt-[4.25rem] overflow-hidden bg-[#09090a] text-white sm:-mt-20"
        >
          <HeaderPark />
          {/* Cenário natalino somente no Preview do PR; véus preservam a leitura dos textos. */}
          {christmas ? <ChristmasScene /> : (
            <>
              <Image src="/hero/oficina-3d.webp" alt="" fill priority sizes="100vw" className="-z-30 object-cover" />
              <HeroVideo />
            </>
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-black/55" />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,transparent_0%,rgb(10_9_7/0.55)_70%)]"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-b from-transparent to-[#09090a]" />

          <div className="page-container flex min-h-[680px] flex-col items-center justify-center px-4 pt-32 pb-28 text-center sm:min-h-[840px] sm:pt-36">
            {/* Selo sem chip: ícone e texto no degradê dourado da marca. */}
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide">
              <HiOutlineCubeTransparent className="size-5 text-gold-light" aria-hidden />
              <span className="bg-gold-gradient bg-clip-text text-transparent">{texts.tagline}</span>
            </p>
            <h1 className="mt-6 max-w-3xl text-[2rem] leading-[1.08] font-bold tracking-tight text-balance sm:text-[2.75rem] lg:text-[3.25rem]">
              <HighlightedTitle text={texts.heroTitle} />
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{texts.heroDescription}</p>
            <div className="mt-9 w-full">
              <HomeSearchInput />
            </div>
            {/* Atalhos abaixo da busca: o catálogo completo e o pedido sob medida (WhatsApp). */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <Link href="/catalogo" className="group inline-flex items-center gap-1.5 text-white/70 transition-colors hover:text-white">
                <HiOutlineSquares2X2 className="size-4" aria-hidden />
                Ver catálogo completo
                <HiArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              {contactUrl ? (
                <>
                  <span aria-hidden className="size-1 rounded-full bg-white/30" />
                  <a
                    href={contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                  >
                    <FaWhatsapp className="size-4 text-gold-light" aria-hidden />
                    Pedido sob medida
                    <HiArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <HomeSearchArea>
          <Suspense fallback={<CategoriesSkeleton />}>
            <CategoriesSection />
          </Suspense>

          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedSection />
          </Suspense>

          <CustomOrderCard />

          <section className="page-container pt-14 pb-16" aria-labelledby="todos-titulo">
            <PreviewCartProducts />
            <Suspense
              fallback={
                <>
                  <Skeleton className="mb-6 h-7 w-48" />
                  <ProductGridSkeleton count={10} />
                </>
              }
            >
              <AllProductsSection />
            </Suspense>
          </section>
        </HomeSearchArea>
      </HomeSearchProvider>
    </>
  )
}

async function CategoriesSection() {
  const result = await load(getShowcaseCategories)
  // Sem categorias (ou com falha), a seção é omitida; a falha aparece na seção de produtos.
  if (!result.ok || result.data.length === 0) return null

  return <CategoriesCarousel title={siteConfig.texts.categoriesTitle} categories={result.data} />
}

function CategoriesSkeleton() {
  return (
    <div className="page-container pt-14" aria-hidden>
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-[68%] shrink-0 rounded-2xl sm:w-64 lg:w-72" />
        ))}
      </div>
    </div>
  )
}

async function AllProductsSection() {
  const result = await load(() => getCatalogPage(parseCatalogQuery({ sort: "recentes" })))

  const title = (
    <h2 id="todos-titulo" className="text-xl font-semibold sm:text-2xl">
      {siteConfig.texts.allProductsTitle}
    </h2>
  )

  if (!result.ok) {
    return (
      <>
        <div className="mb-6">{title}</div>
        <LoadError result={result} retryHref="/" />
      </>
    )
  }

  if (result.data.total === 0) {
    return (
      <>
        <div className="sr-only">{title}</div>
        <StateMessage
          icon={HiOutlineCubeTransparent}
          title="Catálogo em preparação"
          description="Os produtos da ABMC 3D serão publicados aqui em breve."
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-6">{title}</div>
      <AllProducts initial={result.data} />
    </>
  )
}

/** Título com as palavras entre *asteriscos* em destaque (degradê dourado) e "\n" como quebra de linha. */
function HighlightedTitle({ text }: { text: string }) {
  return text.split(/(\*[^*]+\*|\n)/).map((part, index) =>
    part === "\n" ? (
      <br key={index} />
    ) : part.startsWith("*") && part.endsWith("*") ? (
      <span key={index} className="bg-gold-gradient bg-clip-text whitespace-nowrap text-transparent">
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    ),
  )
}
