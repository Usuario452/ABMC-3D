import Link from "next/link"
import { ProductCard } from "@/components/catalog/product-card"
import { FeaturedProducts } from "@/components/home/featured-products"
import { ScrollRow } from "@/components/home/scroll-row"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { getHomeProducts } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { cn } from "@/lib/utils"

/**
 * Seção "Destaques" num trilho horizontal, com título e link para o catálogo. Sem produtos marcados como
 * destaque, mostra os mais recentes com o mesmo título (é uma seção só). Usada na home, nas categorias e
 * nos produtos. `variant="cards"` usa os cards comuns da loja (com "Add") no carrossel, como na página do
 * produto; o padrão são os cards altos com a foto inteira.
 */
export async function FeaturedSection({
  className = "pt-14",
  contentClassName,
  showCatalogLink = true,
  excludeId,
  variant = "tall",
}: {
  className?: string
  /** Classes do miolo (ex.: largura máxima na página do produto). */
  contentClassName?: string
  /** Link "Ver catálogo" ao lado do título (as páginas de categoria e de produto não mostram). */
  showCatalogLink?: boolean
  /** Produto a deixar de fora (na página de um produto, ele mesmo). */
  excludeId?: string
  /** "tall": cards altos com a foto inteira; "cards": os cards comuns da loja. */
  variant?: "tall" | "cards"
}) {
  const result = await load(getHomeProducts)
  if (!result.ok) return null
  const products = result.data.products.filter((product) => product.id !== excludeId)
  // Sem destaques (ou com falha), a seção some.
  if (products.length === 0) return null

  const title = siteConfig.texts.featuredTitle
  return (
    <section className={cn("page-container", className)} aria-labelledby="destaques-titulo">
      <div className={contentClassName}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase">
              <span className="text-gold-gradient">Selecionados para você</span>
            </p>
            <h2
              id="destaques-titulo"
              className={cn(
                "font-bold tracking-tight",
                variant === "cards" ? "mt-1 text-xl sm:text-2xl" : "mt-1.5 text-2xl sm:text-3xl",
              )}
            >
              {title}
            </h2>
          </div>
          {showCatalogLink ? (
            <Link href="/catalogo" className="shrink-0 text-sm font-medium text-gold hover:underline">
              Ver catálogo
            </Link>
          ) : null}
        </div>
        {variant === "cards" ? (
          <ScrollRow label={title}>
            {products.map((product) => (
              <li key={product.id} className="w-[46%] shrink-0 snap-start py-2 sm:w-56 lg:w-60">
                <ProductCard product={product} />
              </li>
            ))}
          </ScrollRow>
        ) : (
          <FeaturedProducts label={title} products={products} />
        )}
      </div>
    </section>
  )
}

export function FeaturedSkeleton({
  className = "pt-14",
  contentClassName,
}: {
  className?: string
  contentClassName?: string
}) {
  return (
    <div className={cn("page-container", className)} aria-hidden>
      <div className={contentClassName}>
        <Skeleton className="mb-6 h-12 w-56" />
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-[60%] shrink-0 rounded-2xl sm:w-60 lg:w-64" />
          ))}
        </div>
      </div>
    </div>
  )
}
