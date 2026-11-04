import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Desconto em % (arredondado) do preço atual em relação ao original; null se não houver desconto. */
export function discountPercent(priceCents: number, compareAtPriceCents: number | null) {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) return null
  return Math.round((1 - priceCents / compareAtPriceCents) * 100)
}

/**
 * Preço da loja: o atual em destaque e, com desconto, o original riscado e um selo "-X%" logo acima dele.
 * `size` muda só a escala (card, página do produto, card escuro dos destaques).
 */
export function Price({
  priceCents,
  compareAtPriceCents,
  size = "card",
  tone = "default",
  className,
}: {
  priceCents: number
  compareAtPriceCents: number | null
  size?: "card" | "lg"
  /** "onDark": sobre foto escura (card alto dos destaques). */
  tone?: "default" | "onDark"
  className?: string
}) {
  const percent = discountPercent(priceCents, compareAtPriceCents)

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {/* Com desconto: o preço original riscado e o selo em cima, o preço atual embaixo. */}
      {percent !== null && compareAtPriceCents ? (
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "leading-none line-through",
              tone === "onDark" ? "text-white/70" : "text-muted-foreground",
              size === "lg" ? "text-sm" : "text-xs",
            )}
          >
            <span className="sr-only">De </span>
            {formatPrice(compareAtPriceCents)}
          </p>
          <span
            className={cn(
              "rounded-md bg-success/12 px-1.5 py-0.5 leading-none font-semibold text-success",
              size === "lg" ? "text-xs" : "text-[0.65rem]",
            )}
          >
            -{percent}%
          </span>
        </div>
      ) : null}
      <p
        className={cn(
          "leading-none font-bold tracking-tight",
          tone === "onDark" ? "text-gold-light" : "text-gold dark:text-gold-light",
          size === "lg" ? "text-2xl" : "text-base sm:text-xl",
        )}
      >
        {percent !== null ? <span className="sr-only">Por </span> : null}
        {formatPrice(priceCents)}
      </p>
    </div>
  )
}
