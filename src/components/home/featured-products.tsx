import Image from "next/image"
import Link from "next/link"
import { HiArrowUpRight, HiOutlinePhoto } from "react-icons/hi2"
import { ScrollRow } from "@/components/home/scroll-row"
import { Price } from "@/components/catalog/price"
import type { ProductCardData } from "@/types/catalog"

/**
 * Destaques da home num trilho horizontal: cards altos com a foto inteira e categoria, nome e preço
 * sobre um degradê, diferentes da grade comum de produtos.
 */
export function FeaturedProducts({ label, products }: { label: string; products: ProductCardData[] }) {
  return (
    <ScrollRow label={label}>
      {products.map((product, index) => (
        <li key={product.id} className="w-[60%] shrink-0 snap-start sm:w-60 lg:w-64">
          <Link
            href={`/produtos/${product.slug}`}
            className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#14120f] text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {product.image?.url ? (
              <Image
                src={product.image.url}
                alt={product.image.altText || product.name}
                fill
                preload={index < 2}
                sizes="(min-width: 1024px) 256px, (min-width: 640px) 240px, 60vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                <HiOutlinePhoto className="size-12" aria-hidden />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/75 via-black/35 to-transparent transition-colors duration-300 group-hover:from-black/85"
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              {product.category ? (
                <p className="text-[0.7rem] font-semibold tracking-wide text-white/80 uppercase">
                  {product.category.name}
                </p>
              ) : null}
              <h3 className="mt-1 flex items-start gap-1.5 text-base leading-tight font-semibold">
                <span className="line-clamp-2">{product.name}</span>
                <HiArrowUpRight
                  className="mt-0.5 size-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100"
                  aria-hidden
                />
              </h3>
              <Price
                priceCents={product.priceCents}
                compareAtPriceCents={product.compareAtPriceCents}
                tone="onDark"
                className="mt-1.5"
              />
            </div>
          </Link>
        </li>
      ))}
    </ScrollRow>
  )
}
