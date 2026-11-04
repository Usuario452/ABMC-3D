import Image from "next/image"
import Link from "next/link"
import { HiArrowUpRight, HiOutlineCube } from "react-icons/hi2"
import { ScrollRow } from "@/components/home/scroll-row"
import { buildCategoryHref } from "@/lib/catalog-url"
import type { CategoryShowcase } from "@/lib/data/catalog"

/**
 * Carrossel de categorias da home: cards com a capa e, sobre um degradê que sobe de baixo, o nome e a
 * descrição (até duas linhas).
 */
export function CategoriesCarousel({ title, categories }: { title: string; categories: CategoryShowcase[] }) {
  return (
    <section className="page-container pt-14" aria-label={title}>
      <ScrollRow label={title}>
        {categories.map((category) => (
          <li key={category.id} className="w-[68%] shrink-0 snap-start sm:w-64 lg:w-72">
            <Link
              href={buildCategoryHref(category.id)}
              className="group relative block aspect-[2/3] overflow-hidden rounded-2xl bg-[#14120f] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {category.coverUrl ? (
                <Image
                  src={category.coverUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 288px, (min-width: 640px) 256px, 68vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                // Sem capa: fundo escuro com o cubo da marca, para o card não ficar vazio.
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgb(250_204_21/0.18),transparent_65%)]">
                  <HiOutlineCube className="size-16 text-gold/50" aria-hidden />
                </div>
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/95"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="flex items-center gap-1.5 text-lg leading-tight font-semibold">
                  {category.name}
                  <HiArrowUpRight
                    className="size-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold group-hover:opacity-100"
                    aria-hidden
                  />
                </h3>
                {category.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/75">{category.description}</p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ScrollRow>
    </section>
  )
}
