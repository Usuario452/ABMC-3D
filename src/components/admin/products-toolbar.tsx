"use client"

import { type ReactNode, useState } from "react"
import type { IconType } from "react-icons"
import {
  HiMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowsUpDown,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlinePhoto,
  HiOutlineSquares2X2,
  HiXMark,
} from "react-icons/hi2"
import {
  DEFAULT_PRODUCT_SORT,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  type ProductSort,
  type ProductStatusFilter,
} from "@/components/admin/product-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ALL = "todas"

const STATUS_ICONS: Record<ProductStatusFilter, IconType> = {
  todos: HiOutlineSquares2X2,
  publicados: HiOutlineEye,
  ocultos: HiOutlineEyeSlash,
  "sem-foto": HiOutlinePhoto,
}

export type ProductFilters = { q: string; categoria: string; status: ProductStatusFilter; ordem: ProductSort }

/**
 * Busca, botão de filtros (categoria e situação num popover) e ação principal, numa linha só.
 * Controlada por quem a usa: os filtros são estado no cliente, e a lista filtra na hora.
 */
export function ProductsToolbar({
  filters,
  onChange,
  categories,
  counts,
  action,
}: {
  filters: ProductFilters
  onChange: (next: Partial<ProductFilters>) => void
  categories: { id: string; name: string }[]
  counts: Record<ProductStatusFilter, number>
  /** Botão à direita da linha (ex.: "Novo produto"). */
  action?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Rascunho do popover: só vale ao clicar em "Aplicar".
  const [draft, setDraft] = useState({ categoria: filters.categoria, status: filters.status, ordem: filters.ordem })

  const activeCount =
    (filters.categoria ? 1 : 0) + (filters.status !== "todos" ? 1 : 0) + (filters.ordem !== DEFAULT_PRODUCT_SORT ? 1 : 0)

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <div role="search" className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
        <Label htmlFor="admin-search" className="sr-only">
          Buscar produto pelo nome
        </Label>
        <HiMagnifyingGlass
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="admin-search"
          type="search"
          enterKeyHint="search"
          maxLength={80}
          autoComplete="off"
          placeholder="Buscar produto"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value.slice(0, 80) })}
          className="h-9 border-transparent bg-card pr-9 pl-9 shadow-panel [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.q ? (
          <button
            type="button"
            onClick={() => onChange({ q: "" })}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HiXMark className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft({ categoria: filters.categoria, status: filters.status, ordem: filters.ordem })
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-2.5 text-sm font-medium shadow-panel transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3.5",
              activeCount > 0 ? "bg-gold/15 text-gold" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <HiOutlineAdjustmentsHorizontal className="size-4" aria-hidden />
            {/* No celular, só o ícone: busca, filtros e "novo" cabem numa linha. */}
            <span className="sr-only sm:not-sr-only">Filtros</span>
            {activeCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] overflow-hidden rounded-lg border border-border p-0 shadow-lg shadow-black/5 ring-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <HiOutlineAdjustmentsHorizontal className="size-4 text-gold" aria-hidden />
              Filtrar e ordenar
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar filtros"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HiXMark className="size-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold">Situação</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(PRODUCT_STATUSES) as ProductStatusFilter[]).map((status) => {
                  const Icon = STATUS_ICONS[status]
                  const current = draft.status === status
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={current}
                      onClick={() => setDraft((value) => ({ ...value, status }))}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        current
                          ? "bg-gold/15 text-gold ring-1 ring-gold/40"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{PRODUCT_STATUSES[status]}</span>
                      <span className="tabular-nums opacity-70">{counts[status]}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="admin-category" className="mb-2 text-xs font-semibold">
                Categoria
              </Label>
              <Select
                value={draft.categoria || ALL}
                onValueChange={(value) => setDraft((current) => ({ ...current, categoria: value === ALL ? "" : value }))}
              >
                <SelectTrigger id="admin-category" className="h-9 w-full bg-muted/60">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectItem value={ALL}>Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="admin-sort" className="mb-2 text-xs font-semibold">
                Ordenar por
              </Label>
              <Select value={draft.ordem} onValueChange={(value) => setDraft((current) => ({ ...current, ordem: value as ProductSort }))}>
                <SelectTrigger id="admin-sort" className="h-9 w-full bg-muted/60">
                  <span className="flex min-w-0 items-center gap-2">
                    <HiOutlineArrowsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {(Object.keys(PRODUCT_SORTS) as ProductSort[]).map((sort) => (
                    <SelectItem key={sort} value={sort}>
                      {PRODUCT_SORTS[sort]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft({ categoria: "", status: "todos", ordem: DEFAULT_PRODUCT_SORT })
                onChange({ categoria: "", status: "todos", ordem: DEFAULT_PRODUCT_SORT })
                setOpen(false)
              }}
            >
              Limpar filtros
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(draft)
                setOpen(false)
              }}
            >
              Aplicar filtros
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {action}
    </div>
  )
}
