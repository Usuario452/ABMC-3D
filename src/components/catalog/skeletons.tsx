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
          <li key={index} className="rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-14px_rgb(0_0_0/0.18)]">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-2 px-2 pt-3 pb-1.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Carregando produtos…</span>
    </div>
  )
}

/** Botão "Filtros" do celular carregando (no lg a ordenação e os filtros ficam na coluna). */
export function FiltersSkeleton() {
  return <Skeleton className="h-9 w-24 lg:hidden" aria-hidden />
}

/** Coluna de filtros carregando: três blocos de título e opções. */
export function SidebarSkeleton() {
  return (
    <div className="space-y-7" aria-hidden>
      {[1, 5, 4, 2].map((rows, section) => (
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
    <div role="status" aria-label="Carregando produto" className="mx-auto max-w-7xl">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20 xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-3 h-7 w-4/5" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-5 h-10 w-full" />
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>
      </div>
      <span className="sr-only">Carregando produto…</span>
    </div>
  )
}

/** Listagem com filtros carregando: coluna lateral (lg), barra de cima e grade. */
export function CatalogBrowserSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[256px_minmax(0,1fr)]">
      <div className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
        <SidebarSkeleton />
      </div>
      <div className="min-w-0 space-y-5">
        <FiltersSkeleton />
        <ProductGridSkeleton columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
      </div>
    </div>
  )
}
