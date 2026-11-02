import Link from "next/link"
import { Suspense } from "react"
import type { IconType } from "react-icons"
import {
  HiArrowRight,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCube,
  HiOutlineCubeTransparent,
  HiOutlineHandRaised,
} from "react-icons/hi2"
import { ProductGrid } from "@/components/catalog/product-card"
import { ProductGridSkeleton } from "@/components/catalog/skeletons"
import { LoadError } from "@/components/shared/load-error"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { getActiveCategories, getHomeProducts } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"

const benefitIcons: IconType[] = [HiOutlineCube, HiOutlineChatBubbleLeftRight, HiOutlineHandRaised]

export default function HomePage() {
  const { texts } = siteConfig

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-96 max-w-3xl rounded-full bg-gold/10 blur-3xl"
        />
        <div className="page-container relative py-20 sm:py-28">
          <p className="text-sm font-semibold tracking-[0.2em] text-gold uppercase">{texts.tagline}</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
            {texts.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{texts.heroDescription}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/catalogo">
                Ver catálogo
                <HiArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </div>
      </section>

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>

      <section className="page-container py-14" aria-labelledby="produtos-titulo">
        <Suspense
          fallback={
            <>
              <Skeleton className="mb-8 h-8 w-40" />
              <ProductGridSkeleton count={4} />
            </>
          }
        >
          <HomeProductsSection />
        </Suspense>
      </section>

      <section id="como-funciona" className="border-y border-border bg-surface" aria-labelledby="beneficios-titulo">
        <div className="page-container py-16">
          <h2 id="beneficios-titulo" className="text-2xl font-semibold sm:text-3xl">
            {texts.benefitsTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {texts.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index] ?? HiOutlineCubeTransparent
              return (
                <li key={benefit.title} className="rounded-xl border border-border bg-background p-6">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-surface-elevated text-gold">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="page-container py-16">
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-2xl font-semibold">{texts.ctaTitle}</h2>
            <p className="mt-2 text-muted-foreground">{texts.ctaDescription}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/catalogo">
              Explorar catálogo
              <HiArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}

async function CategoriesSection() {
  const result = await load(getActiveCategories)
  // Sem categorias (ou com falha), a seção é omitida; a falha aparece na seção de produtos.
  if (!result.ok || result.data.length === 0) return null

  return (
    <section className="page-container pt-14" aria-labelledby="categorias-titulo">
      <h2 id="categorias-titulo" className="text-2xl font-semibold sm:text-3xl">
        {siteConfig.texts.categoriesTitle}
      </h2>
      <ul className="mt-6 flex flex-wrap gap-3">
        {result.data.map((category) => (
          <li key={category.id}>
            <Link
              href={`/catalogo?categoria=${category.slug}`}
              className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-gold/60 hover:text-gold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CategoriesSkeleton() {
  return (
    <div className="page-container pt-14" aria-hidden>
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full" />
        ))}
      </div>
    </div>
  )
}

async function HomeProductsSection() {
  const result = await load(getHomeProducts)

  if (!result.ok) {
    return (
      <>
        <h2 id="produtos-titulo" className="mb-8 text-2xl font-semibold sm:text-3xl">
          {siteConfig.texts.featuredTitle}
        </h2>
        <LoadError result={result} retryHref="/" />
      </>
    )
  }

  const { kind, products } = result.data
  const title = kind === "featured" ? siteConfig.texts.featuredTitle : siteConfig.texts.latestTitle

  if (products.length === 0) {
    return (
      <>
        <h2 id="produtos-titulo" className="sr-only">
          Produtos
        </h2>
        <StateMessage
          icon={HiOutlineCubeTransparent}
          title="Catálogo em preparação"
          description="Os produtos da KuboStudio serão publicados aqui em breve."
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 id="produtos-titulo" className="text-2xl font-semibold sm:text-3xl">
          {title}
        </h2>
        <Link href="/catalogo" className="shrink-0 text-sm font-medium text-gold hover:underline">
          Ver todos
        </Link>
      </div>
      <ProductGrid products={products} preloadFirst={2} />
    </>
  )
}
