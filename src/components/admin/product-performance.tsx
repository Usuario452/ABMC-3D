"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { HiChevronDown, HiOutlinePhoto } from "react-icons/hi2"
import type { ProductPerformance } from "@/lib/data/admin"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

type SortKey = "views" | "cartAdds" | "cartRate" | "orders" | "revenueCents"

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "views", label: "Visualizações" },
  { key: "cartAdds", label: "No carrinho" },
  { key: "cartRate", label: "Taxa carrinho", className: "hidden sm:table-cell" },
  { key: "orders", label: "Pedidos", className: "hidden md:table-cell" },
  { key: "revenueCents", label: "Faturamento", className: "hidden lg:table-cell" },
]

/** Quantos produtos aparecem antes de "Mostrar todos". */
const INITIAL_ROWS = 8

/** Parte das visualizações que virou item no carrinho; sem visualização, não há taxa. */
const cartRate = (product: ProductPerformance) => (product.views > 0 ? product.cartAdds / product.views : -1)

const formatRate = (rate: number) =>
  rate < 0 ? "—" : `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

/** Produtos cadastrados com visitas, carrinho e pedidos no período, ordenáveis por coluna. */
export function ProductPerformanceTable({ products }: { products: ProductPerformance[] }) {
  const [sort, setSort] = useState<SortKey>("views")
  const [expanded, setExpanded] = useState(false)

  if (products.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        Cadastre produtos para acompanhar visitas, carrinho e pedidos de cada um.
      </p>
    )
  }

  const value = (product: ProductPerformance) => (sort === "cartRate" ? cartRate(product) : product[sort])
  const sorted = [...products].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name, "pt-BR"))
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_ROWS)

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              Produto
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort === column.key ? "descending" : undefined}
                className={cn("px-4 py-2.5 text-right font-medium", column.className)}
              >
                <button
                  type="button"
                  onClick={() => setSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    sort === column.key && "text-gold",
                  )}
                >
                  {column.label}
                  <HiChevronDown className={cn("size-3", sort !== column.key && "invisible")} aria-hidden />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((product, index) => (
            <tr key={product.id} className="border-t border-border/60">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                  <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <HiOutlinePhoto className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/produtos/${product.id}`} className="line-clamp-1 font-medium hover:text-gold">
                      {product.name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {product.category}
                      {product.isActive ? null : " · inativo"}
                    </span>
                  </div>
                </div>
              </td>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums",
                    column.className,
                    sort === column.key ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  {column.key === "cartRate"
                    ? formatRate(cartRate(product))
                    : column.key === "revenueCents"
                      ? formatPrice(product.revenueCents)
                      : product[column.key].toLocaleString("pt-BR")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {products.length > INITIAL_ROWS ? (
        <div className="border-t border-border/60 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? "Mostrar menos" : `Mostrar todos (${products.length})`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
