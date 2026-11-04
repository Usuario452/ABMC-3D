import Link from "next/link"
import { FeaturedProducts } from "@/components/home/featured-products"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { getHomeProducts } from "@/lib/data/catalog"
import { load } from "@/lib/data/load"
import { cn } from "@/lib/utils"

/**
 * Seção de destaques (ou, sem destaques, das novidades) num trilho horizontal, com título e link para o
 * catálogo. Usada na home e embaixo da página de cada categoria.
 */
export async function FeaturedSection({
  className = "pt-14",
  showCatalogLink = true,
}: {
  className?: string
  /** Link "Ver catálogo" ao lado do título (a página da categoria não mostra). */
  showCatalogLink?: boolean
}) {
  const result = await load(getHomeProducts)
  // Sem destaques (ou com falha), a seção some.
  if (!result.ok || result.data.products.length === 0) return null

  const { kind, products } = result.data
  const title = kind === "featured" ? siteConfig.texts.featuredTitle : siteConfig.texts.latestTitle
  return (
    <section className={cn("page-container", className)} aria-labelledby="destaques-titulo">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase">
            <span className="text-gold-gradient">
              {kind === "featured" ? "Selecionados para você" : "Acabaram de chegar"}
            </span>
          </p>
          <h2 id="destaques-titulo" className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
        </div>
        {showCatalogLink ? (
          <Link href="/catalogo" className="shrink-0 text-sm font-medium text-gold hover:underline">
            Ver catálogo
          </Link>
        ) : null}
      </div>
      <FeaturedProducts label={title} products={products} />
    </section>
  )
}

export function FeaturedSkeleton({ className = "pt-14" }: { className?: string }) {
  return (
    <div className={cn("page-container", className)} aria-hidden>
      <Skeleton className="mb-6 h-12 w-56" />
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-[60%] shrink-0 rounded-2xl sm:w-60 lg:w-64" />
        ))}
      </div>
    </div>
  )
}
