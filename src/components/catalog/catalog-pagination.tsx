import Link from "next/link"
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2"
import { buildCatalogHref } from "@/lib/catalog-url"
import { Button } from "@/components/ui/button"
import type { CatalogQuery } from "@/types/catalog"

export function CatalogPagination({ query, pageCount }: { query: CatalogQuery; pageCount: number }) {
  if (pageCount <= 1) return null

  const page = Math.min(query.page, pageCount)
  const prev = page > 1 ? buildCatalogHref({ ...query, page: page - 1 }) : null
  const next = page < pageCount ? buildCatalogHref({ ...query, page: page + 1 }) : null

  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-3">
      {prev ? (
        <Button asChild variant="outline">
          <Link href={prev} rel="prev">
            <HiChevronLeft aria-hidden />
            Anterior
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <HiChevronLeft aria-hidden />
          Anterior
        </Button>
      )}
      <span className="min-w-28 text-center text-sm text-muted-foreground" aria-current="page">
        Página {page} de {pageCount}
      </span>
      {next ? (
        <Button asChild variant="outline">
          <Link href={next} rel="next">
            Próxima
            <HiChevronRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Próxima
          <HiChevronRight aria-hidden />
        </Button>
      )}
    </nav>
  )
}
