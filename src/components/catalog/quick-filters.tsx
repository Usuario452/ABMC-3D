import Link from "next/link"
import type { ReactNode } from "react"
import { HiOutlineSparkles, HiOutlineStar } from "react-icons/hi2"
import { Skeleton } from "@/components/ui/skeleton"
import { buildCatalogHref } from "@/lib/catalog-url"
import { cn } from "@/lib/utils"
import type { CatalogFacets, CatalogQuery } from "@/types/catalog"

/**
 * Atalhos de filtro em cima da grade, em pílulas roláveis: todas as categorias (com a quantidade) e, depois
 * de um separador, "Destaques" e "Novidades". A pílula ativa fica dourada; clicar de novo desfaz.
 */
export function QuickFilters({ query, facets }: { query: CatalogQuery; facets: CatalogFacets }) {
  const href = (next: Partial<CatalogQuery>) => buildCatalogHref({ ...query, ...next, page: 1 })
  const categories = facets.categories.filter((category) => category.count > 0 || category.slug === query.category)

  return (
    <nav aria-label="Filtros rápidos" className="-mx-4 sm:mx-0">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        <li className="shrink-0">
          <Pill href={href({ category: "" })} active={!query.category}>
            Todas
          </Pill>
        </li>
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Pill
              href={href({ category: category.slug === query.category ? "" : category.slug })}
              active={category.slug === query.category}
              count={category.count}
            >
              {category.name}
            </Pill>
          </li>
        ))}
        <li aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />
        <li className="shrink-0">
          <Pill
            href={href({ featured: !query.featured })}
            active={query.featured}
            count={facets.featured}
            disabled={facets.featured === 0 && !query.featured}
            icon={<HiOutlineStar className="size-3.5" aria-hidden />}
          >
            Destaques
          </Pill>
        </li>
        <li className="shrink-0">
          <Pill
            href={href({ recent: !query.recent })}
            active={query.recent}
            count={facets.recent}
            disabled={facets.recent === 0 && !query.recent}
            icon={<HiOutlineSparkles className="size-3.5" aria-hidden />}
          >
            Novidades
          </Pill>
        </li>
      </ul>
    </nav>
  )
}

function Pill({
  href,
  active,
  count,
  disabled = false,
  icon,
  children,
}: {
  href: string
  active: boolean
  count?: number
  disabled?: boolean
  icon?: ReactNode
  children: ReactNode
}) {
  const className = cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
    active
      ? "border-gold bg-gold text-black"
      : "border-border bg-card text-foreground/80 hover:border-gold/60 hover:text-foreground",
    disabled && "pointer-events-none opacity-45",
  )
  const content = (
    <>
      {icon}
      {children}
      {count !== undefined ? (
        <span className={cn("tabular-nums", active ? "text-black/60" : "text-muted-foreground")}>{count}</span>
      ) : null}
    </>
  )

  if (disabled) return <span className={className}>{content}</span>
  return (
    <Link href={href} scroll={false} aria-current={active ? "true" : undefined} className={className}>
      {content}
    </Link>
  )
}

export function QuickFiltersSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden" aria-hidden>
      {[56, 88, 72, 96, 80, 84].map((width, index) => (
        <Skeleton key={index} className="h-8 shrink-0 rounded-full" style={{ width }} />
      ))}
    </div>
  )
}
