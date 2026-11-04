"use client"

import { useRouter } from "next/navigation"
import { useId, useTransition } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildCatalogHref } from "@/lib/catalog-url"
import { cn } from "@/lib/utils"
import { CATALOG_SORTS, type CatalogQuery, type CatalogSort as SortKey } from "@/types/catalog"

/** Ordenação do catálogo; trocar volta para a primeira página e mantém os demais filtros. */
export function CatalogSort({ query, className }: { query: CatalogQuery; className?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // A coluna aparece duas vezes (no lg e na gaveta do celular): id único por instância.
  const id = useId()

  return (
    <div className={cn("transition-opacity", isPending && "opacity-70", className)} aria-busy={isPending}>
      <Label htmlFor={id} className="sr-only">
        Ordenar produtos
      </Label>
      <Select
        value={query.sort}
        onValueChange={(value) =>
          startTransition(() =>
            router.push(buildCatalogHref({ ...query, sort: value as SortKey, page: 1 }), { scroll: false }),
          )
        }
      >
        <SelectTrigger id={id} className="w-full rounded-xl bg-background data-[size=default]:h-10">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CATALOG_SORTS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
