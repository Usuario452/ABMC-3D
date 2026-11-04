import Image from "next/image"
import Link from "next/link"
import { HiOutlinePhoto } from "react-icons/hi2"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/format"
import type { ProductCardData } from "@/types/catalog"

export function ProductCard({ product, preload = false }: { product: ProductCardData; preload?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/25">
      <div className="relative aspect-square overflow-hidden bg-surface-elevated">
        {product.image?.url ? (
          <Image
            src={product.image.url}
            alt={product.image.altText || product.name}
            fill
            preload={preload}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <HiOutlinePhoto className="size-10" aria-hidden />
            <span className="sr-only">Produto sem imagem</span>
          </div>
        )}
        {!product.isAvailable ? (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Indisponível
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {product.category ? (
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{product.category.name}</p>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-semibold">
          <Link
            href={`/produtos/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-auto pt-2 text-sm font-bold text-gold sm:text-base">{formatPrice(product.priceCents)}</p>
      </div>
    </article>
  )
}

/** Colunas da grade quando ela divide a largura com a coluna de filtros. */
export const GRID_WITH_SIDEBAR = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
const GRID_FULL = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"

export function ProductGrid({
  products,
  preloadFirst = 0,
  columns = GRID_FULL,
}: {
  products: ProductCardData[]
  preloadFirst?: number
  /** Classes de colunas da grade (padrão: largura toda). */
  columns?: string
}) {
  return (
    <ul className={`grid gap-3 sm:gap-4 ${columns}`}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} preload={index < preloadFirst} />
        </li>
      ))}
    </ul>
  )
}
