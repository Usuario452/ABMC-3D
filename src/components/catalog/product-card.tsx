import Image from "next/image"
import Link from "next/link"
import { HiOutlinePhoto } from "react-icons/hi2"
import { QuickAdd } from "@/components/cart/quick-add"
import { Badge } from "@/components/ui/badge"
import { Price } from "@/components/catalog/price"
import type { ProductCardData } from "@/types/catalog"

/**
 * Card de produto das grades: sem borda, com sombra limpa; no hover o card inteiro sobe e a sombra cresce
 * (a foto não dá zoom). A foto fica num quadro arredondado por dentro do card; embaixo, categoria, nome e,
 * o preço e o botão de adicionar ao carrinho (lado a lado; no celular, o botão embaixo, na largura toda). O link cobre o card todo, menos o botão.
 */
export function ProductCard({ product, preload = false }: { product: ProductCardData; preload?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-14px_rgb(0_0_0/0.18)] ring-1 ring-black/[0.03] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_22px_40px_-18px_rgb(0_0_0/0.3)] dark:ring-white/[0.06]">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-elevated">
        {product.image?.url ? (
          <Image
            src={product.image.url}
            alt={product.image.altText || product.name}
            fill
            preload={preload}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
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

      <div className="flex flex-1 flex-col px-2 pt-3 pb-1.5 sm:px-2.5">
        {product.category ? (
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">{product.category.name}</p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold">
          <Link
            href={`/produtos/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-col gap-2.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
          <Price priceCents={product.priceCents} compareAtPriceCents={product.compareAtPriceCents} />
          {product.isAvailable ? (
            <QuickAdd
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                unitPriceCents: product.priceCents,
                imageUrl: product.image?.url ?? null,
              }}
              className="w-full sm:w-auto"
            />
          ) : null}
        </div>
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
