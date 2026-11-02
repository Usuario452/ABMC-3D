import { cn } from "@/lib/utils"
import type { AdminProductListItem } from "@/lib/data/admin"

type StatusInput = Pick<AdminProductListItem, "is_active" | "is_available" | "category">

/** Situação do produto na loja: publicado ou oculto (e por quê). */
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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        visible ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {visible ? "Publicado" : `Oculto: ${reason}`}
    </span>
  )
}
