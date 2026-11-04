import { Skeleton } from "@/components/ui/skeleton"

export function ProductGridSkeleton({
  count = 8,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
}: {
  count?: number
  columns?: string
}) {
  return (
    <div role="status" aria-label="Carregando produtos">
      <ul className={`grid gap-3 sm:gap-4 ${columns}`} aria-hidden>
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-xl border border-border bg-card">
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Carregando produtos…</span>
    </div>
  )
}

export function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 sm:flex-nowrap" aria-hidden>
      <Skeleton className="h-10 w-full sm:flex-1" />
      <Skeleton className="h-10 w-24 lg:hidden" />
      <Skeleton className="h-10 flex-1 sm:w-52 sm:flex-none" />
    </div>
  )
}

/** Coluna de filtros carregando: três blocos de título e opções. */
export function SidebarSkeleton() {
  return (
    <div className="space-y-7" aria-hidden>
      {[5, 4, 2].map((rows, section) => (
        <div key={section} className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando produto" className="grid gap-8 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <span className="sr-only">Carregando produto…</span>
    </div>
  )
}

/** Listagem com filtros carregando: coluna lateral (lg), barra de cima e grade. */
export function CatalogBrowserSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <SidebarSkeleton />
      </div>
      <div className="min-w-0 space-y-5">
        <FiltersSkeleton />
        <ProductGridSkeleton columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
      </div>
    </div>
  )
}
