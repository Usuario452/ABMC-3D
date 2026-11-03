import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HiCheckCircle, HiChevronRight } from "react-icons/hi2"
import { AddToCart } from "@/components/cart/add-to-cart"
import { TrackProductView } from "@/components/catalog/track-product-view"
import { ProductGallery } from "@/components/catalog/product-gallery"
import { ProductGrid } from "@/components/catalog/product-card"
import { ProductDetailSkeleton } from "@/components/catalog/skeletons"
import { LoadError } from "@/components/shared/load-error"
import { Markdown, markdownToText } from "@/components/shared/markdown"
import { siteConfig } from "@/config/site"
import { getProductBySlug, getRelatedProducts } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { formatPrice } from "@/lib/format"
import { SLUG_PATTERN } from "@/lib/slug"
import { isDatabaseConfigured } from "@/lib/env"

export async function generateMetadata({ params }: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params
  if (!SLUG_PATTERN.test(slug) || !isDatabaseConfigured()) return { title: "Produto" }

  const result = await getProductBySlug(slug)
  if (!result.ok) return { title: "Produto" }

  const product = result.data
  if (!product) return { title: "Produto não encontrado", robots: { index: false } }
  const description = markdownToText(product.description).slice(0, 160) || siteConfig.seo.description
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      // Endereço fixo (/img): a prévia guardada pelo WhatsApp e redes sociais não pode expirar como a URL assinada.
      images: product.image?.url
        ? [{ url: `/img/${product.image.storagePath}`, alt: product.image.altText || product.name }]
        : undefined,
    },
  }
}

export default function ProductPage({ params }: PageProps<"/produtos/[slug]">) {
  return (
    <div className="page-container py-8 sm:py-12">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  )
}

async function ProductContent({ params }: { params: PageProps<"/produtos/[slug]">["params"] }) {
  const { slug } = await params
  if (!SLUG_PATTERN.test(slug)) notFound()

  const result = await load(() => getProductBySlug(slug))
  if (!result.ok) return <LoadError result={result} retryHref={`/produtos/${slug}`} />

  const product = result.data
  if (!product) notFound()

  return (
    <>
      <TrackProductView productId={product.id} />
      <nav aria-label="Trilha de navegação" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/catalogo" className="hover:text-foreground">
              Catálogo
            </Link>
          </li>
          {product.category ? (
            <>
              <li aria-hidden>
                <HiChevronRight className="size-4" />
              </li>
              <li>
                <Link href={`/catalogo?categoria=${product.category.slug}`} className="hover:text-foreground">
                  {product.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>
            <HiChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="line-clamp-1 text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col">
          {product.category ? (
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{product.category.name}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold text-gold">{formatPrice(product.priceCents)}</p>

          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-success">
            <HiCheckCircle className="size-5" aria-hidden />
            Disponível
          </p>

          <div className="mt-8">
            <AddToCart
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                unitPriceCents: product.priceCents,
                imageUrl: product.image?.url ?? null,
              }}
            />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{siteConfig.texts.orderDisclaimer}</p>

          {product.description ? (
            <section className="mt-10 border-t border-border pt-8" aria-labelledby="descricao-titulo">
              <h2 id="descricao-titulo" className="text-lg font-semibold">
                Descrição
              </h2>
              <Markdown className="mt-3">{product.description}</Markdown>
            </section>
          ) : null}
        </div>
      </div>

      {product.category ? (
        <Suspense fallback={null}>
          <RelatedProducts categoryId={product.category.id} productId={product.id} />
        </Suspense>
      ) : null}
    </>
  )
}

async function RelatedProducts({ categoryId, productId }: { categoryId: string; productId: string }) {
  const result = await load(() => getRelatedProducts(categoryId, productId))
  if (!result.ok || result.data.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-10" aria-labelledby="relacionados-titulo">
      <h2 id="relacionados-titulo" className="mb-6 text-2xl font-semibold">
        Você também pode gostar
      </h2>
      <ProductGrid products={result.data} />
    </section>
  )
}
