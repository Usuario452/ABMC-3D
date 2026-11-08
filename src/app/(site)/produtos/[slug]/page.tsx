import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HiOutlineChatBubbleLeftRight, HiOutlineCube, HiOutlineSwatch } from "react-icons/hi2"
import { AddToCart } from "@/components/cart/add-to-cart"
import { TrackProductView } from "@/components/catalog/track-product-view"
import { ProductGallery } from "@/components/catalog/product-gallery"
import { ProductCard } from "@/components/catalog/product-card"
import { ProductDetailSkeleton } from "@/components/catalog/skeletons"
import { FeaturedSection, FeaturedSkeleton } from "@/components/home/featured-section"
import { ScrollRow } from "@/components/home/scroll-row"
import { JsonLd } from "@/components/shared/json-ld"
import { LoadError } from "@/components/shared/load-error"
import { Expandable } from "@/components/shared/expandable"
import { Markdown, markdownToText } from "@/components/shared/markdown"
import { siteConfig } from "@/config/site"
import { getProductBySlug, getRelatedProducts } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { getPreviewProductDetail } from "@/lib/preview-cart-products"
import { formatPrice } from "@/lib/format"
import { Price } from "@/components/catalog/price"
import { SLUG_PATTERN } from "@/lib/slug"
import { isDatabaseConfigured } from "@/lib/env"
import { buildCategoryHref } from "@/lib/catalog-url"
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo"
import type { CategorySummary } from "@/types/catalog"

export async function generateMetadata({ params }: PageProps<"/produtos/[slug]">): Promise<Metadata> {
  const { slug } = await params
  if (!SLUG_PATTERN.test(slug) || !isDatabaseConfigured()) return { title: "Produto" }

  const result = await getProductBySlug(slug)
  if (!result.ok) return { title: "Produto" }

  const product = result.data
  if (!product) return { title: "Produto não encontrado", robots: { index: false } }
  // Preço na frente da descrição: aparece no resultado de busca e na prévia do link.
  const summary = markdownToText(product.description) || siteConfig.seo.description
  const description = `${formatPrice(product.priceCents)} · ${summary}`.slice(0, 160)
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      // Endereço fixo (/img): a prévia guardada pelo WhatsApp e redes sociais não pode expirar como a URL assinada.
      images: product.image?.url
        ? [
            {
              url: `/img/${product.image.storagePath}`,
              alt: product.image.altText || product.name,
            },
          ]
        : undefined,
    },
  }
}

/**
 * Página do produto, sem banner: sobre a grade quadriculada da página, a galeria à esquerda (presa ao rolar)
 * e, à direita, categoria, nome, preço, quantidade com o botão de adicionar e os diferenciais. Embaixo, a
 * descrição na largura toda (com "Ler mais") e dois carrosséis: mais da mesma categoria e os destaques.
 */
export default function ProductPage({ params }: PageProps<"/produtos/[slug]">) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="bg-grid-page pointer-events-none absolute inset-0 -z-10" />
      <Suspense
        fallback={
          <div className="page-container pt-6 pb-16 sm:pt-8">
            <ProductDetailSkeleton />
          </div>
        }
      >
        <ProductContent params={params} />
      </Suspense>
    </div>
  )
}

/** Diferenciais mostrados abaixo da caixa de compra. */
const HIGHLIGHTS = [
  {
    icon: HiOutlineCube,
    title: "Impresso em 3D",
    text: "Feito na nossa oficina, sob demanda.",
  },
  {
    icon: HiOutlineSwatch,
    title: "Cores e ajustes",
    text: "Personalização sob consulta.",
  },
  {
    icon: HiOutlineChatBubbleLeftRight,
    title: "Atendimento",
    text: "Prazo e entrega combinados no WhatsApp.",
  },
]

async function ProductContent({ params }: { params: PageProps<"/produtos/[slug]">["params"] }) {
  const { slug } = await params
  if (!SLUG_PATTERN.test(slug)) notFound()

  const previewProduct = getPreviewProductDetail(slug)
  const result = previewProduct ? { ok: true as const, data: previewProduct } : await load(() => getProductBySlug(slug))
  if (!result.ok) {
    return (
      <div className="page-container py-10">
        <LoadError result={result} retryHref={`/produtos/${slug}`} />
      </div>
    )
  }

  const product = result.data
  if (!product) notFound()

  return (
    <>
      <TrackProductView productId={product.id} />
      <JsonLd
        data={[
          productJsonLd({
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: markdownToText(product.description).slice(0, 5000),
            priceCents: product.priceCents,
            imagePaths: product.images.map((image) => image.storagePath),
            categoryName: product.category?.name ?? null,
          }),
          breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: "Catálogo", path: "/catalogo" },
            ...(product.category
              ? [{ name: product.category.name, path: buildCategoryHref(product.category.id) }]
              : []),
            { name: product.name, path: `/produtos/${product.slug}` },
          ]),
        ]}
      />
      <div className="page-container pt-6 pb-4 sm:pt-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20 xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
            <div className="md:sticky md:top-24">
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            <div className="flex flex-col">
              {product.category ? (
                <Link
                  href={buildCategoryHref(product.category.id)}
                  className="w-fit text-[0.7rem] font-semibold tracking-wide text-gold uppercase transition-colors hover:text-gold-dark hover:underline"
                >
                  {product.category.name}
                </Link>
              ) : null}
              <h1 className="mt-3 text-xl leading-snug font-bold tracking-tight text-balance sm:text-2xl">
                {product.name}
              </h1>

              <Price
                priceCents={product.priceCents}
                compareAtPriceCents={product.compareAtPriceCents}
                size="lg"
                className="mt-3"
              />

              <div className="mt-5">
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

              <ul className="mt-5 space-y-2.5">
                {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-center gap-2.5 text-xs">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="font-semibold">{title}</span>
                      <span className="text-muted-foreground"> · {text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Descrição na largura toda, recolhida com "Ler mais" quando é longa. */}
          {product.description ? (
            <section className="mt-10 border-t border-border pt-8" aria-labelledby="descricao-titulo">
              <h2 id="descricao-titulo" className="text-base font-bold tracking-tight">
                Sobre o produto
              </h2>
              <Expandable className="mt-3">
                <Markdown className="text-sm leading-relaxed">{product.description}</Markdown>
              </Expandable>
            </section>
          ) : null}
        </div>
      </div>

      {product.category ? (
        <Suspense fallback={null}>
          <SameCategory productId={product.id} category={product.category} />
        </Suspense>
      ) : null}
      <Suspense fallback={<FeaturedSkeleton className="pt-14 pb-16" contentClassName="mx-auto max-w-7xl" />}>
        <FeaturedSection
          className="pt-14 pb-16"
          contentClassName="mx-auto max-w-7xl"
          excludeId={product.id}
          variant="cards"
          showCatalogLink={false}
        />
      </Suspense>
    </>
  )
}

/** Mais produtos da mesma categoria num carrossel (cards da loja, com "Add"), com link para a página dela. */
async function SameCategory({ productId, category }: { productId: string; category: CategorySummary }) {
  const result = await load(() => getRelatedProducts(productId))
  if (!result.ok || result.data.length === 0) return null

  return (
    <section className="page-container pt-14" aria-labelledby="mesma-categoria-titulo">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase">
              <span className="text-gold-gradient">Da mesma categoria</span>
            </p>
            <h2 id="mesma-categoria-titulo" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Mais de {category.name}
            </h2>
          </div>
          <Link
            href={buildCategoryHref(category.id)}
            className="shrink-0 text-sm font-medium text-gold hover:underline"
          >
            Ver categoria
          </Link>
        </div>
        <ScrollRow label={`Mais de ${category.name}`}>
          {result.data.map((product) => (
            <li key={product.id} className="w-[46%] shrink-0 snap-start py-2 sm:w-56 lg:w-60">
              <ProductCard product={product} />
            </li>
          ))}
        </ScrollRow>
      </div>
    </section>
  )
}
