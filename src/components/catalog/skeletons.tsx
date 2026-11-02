import { Skeleton } from "@/components/ui/skeleton"

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando produtos">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-hidden>
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
    <div className="grid gap-3 sm:grid-cols-[1fr_200px_200px]" aria-hidden>
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
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
