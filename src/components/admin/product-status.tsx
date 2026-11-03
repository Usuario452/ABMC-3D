import { cn } from "@/lib/utils"
import type { AdminProductListItem } from "@/lib/data/admin"

type StatusInput = Pick<AdminProductListItem, "is_active" | "is_available" | "category">

/** Filtros de situação da lista de produtos do painel (valor na URL → rótulo). */
export const PRODUCT_STATUSES = {
  todos: "Todos",
  publicados: "Publicados",
  ocultos: "Inativos",
  "sem-foto": "Sem foto",
} as const

export type ProductStatusFilter = keyof typeof PRODUCT_STATUSES

export function isProductStatusFilter(value: unknown): value is ProductStatusFilter {
  return typeof value === "string" && Object.hasOwn(PRODUCT_STATUSES, value)
}

export function matchesStatus(product: StatusInput & Pick<AdminProductListItem, "image">, status: ProductStatusFilter) {
  if (status === "todos") return true
  if (status === "sem-foto") return product.image === null
  return productVisibility(product).visible === (status === "publicados")
}

/** Situação do produto na loja: publicado ou inativo (e por quê, para a dica ao passar o mouse). */
export function productVisibility(product: StatusInput) {
  const reason = !product.is_active
    ? "Inativo"
    : !product.is_available
      ? "Indisponível"
      : product.category && !product.category.is_active
        ? "Categoria inativa"
        : null
  return { visible: reason === null, reason }
}

export function ProductStatusBadge({ product, className }: { product: StatusInput; className?: string }) {
  const { visible, reason } = productVisibility(product)

  return (
    <span
      title={visible ? undefined : `Não aparece na loja: ${reason?.toLowerCase()}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        visible ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {visible ? "Publicado" : "Inativo"}
    </span>
  )
}

/** Ordenações da lista de produtos do painel (valor na URL → rótulo). A primeira é a padrão. */
export const PRODUCT_SORTS = {
  publicados: "Publicados primeiro",
  recentes: "Mais recentes",
  nome: "Nome (A–Z)",
  "preco-asc": "Menor preço",
  "preco-desc": "Maior preço",
  intencoes: "Mais intenções",
} as const

export type ProductSort = keyof typeof PRODUCT_SORTS

export const DEFAULT_PRODUCT_SORT: ProductSort = "publicados"

export function isProductSort(value: unknown): value is ProductSort {
  return typeof value === "string" && Object.hasOwn(PRODUCT_SORTS, value)
}

type SortInput = StatusInput & Pick<AdminProductListItem, "name" | "price_cents" | "cartIntents" | "updated_at">

/** Ordena uma cópia da lista. Empates mantêm a ordem recebida (alterados mais recentemente primeiro). */
export function sortProducts<T extends SortInput>(products: T[], sort: ProductSort): T[] {
  const time = (product: T) => new Date(product.updated_at).getTime()
  const compare: Record<ProductSort, (a: T, b: T) => number> = {
    publicados: (a, b) => Number(productVisibility(b).visible) - Number(productVisibility(a).visible),
    recentes: (a, b) => time(b) - time(a),
    nome: (a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    "preco-asc": (a, b) => a.price_cents - b.price_cents,
    "preco-desc": (a, b) => b.price_cents - a.price_cents,
    intencoes: (a, b) => b.cartIntents - a.cartIntents,
  }
  return [...products].sort(compare[sort])
}
