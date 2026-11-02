import type { IconType } from "react-icons"
import { HiOutlineArrowTrendingDown, HiOutlineArrowTrendingUp, HiOutlineMinus } from "react-icons/hi2"
import { cn } from "@/lib/utils"

/** Cartão de indicador: valor, variação em relação ao período anterior e uma dica curta. */
export function Kpi({
  label,
  icon: Icon,
  value,
  previous,
  hint,
  format = (number: number) => number.toLocaleString("pt-BR"),
  /** Quando menor é melhor (ex.: buscas sem resultado), a variação para baixo aparece como positiva. */
  lowerIsBetter = false,
}: {
  label: string
  icon: IconType
  value: number | undefined
  previous?: number
  hint?: string
  format?: (value: number) => string
  lowerIsBetter?: boolean
}) {
  // Variação em relação ao período anterior. Sem base (anterior zerado), conta como 0% ou "novo".
  const compared = value !== undefined && previous !== undefined
  const delta = compared && previous > 0 ? ((value - previous) / previous) * 100 : compared && value === 0 ? 0 : null
  const isNew = compared && previous === 0 && value > 0
  const good = delta !== null && (lowerIsBetter ? delta <= 0 : delta >= 0)

  return (
    <div className="rounded-lg bg-card p-4 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <span className="flex size-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <dd className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value === undefined ? "—" : format(value)}</dd>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {isNew ? (
          <span className="inline-flex items-center gap-0.5 font-medium text-success">
            <HiOutlineArrowTrendingUp className="size-3.5" aria-hidden />
            novo
          </span>
        ) : delta === 0 ? (
          <span className="inline-flex items-center gap-0.5 font-medium">
            <HiOutlineMinus className="size-3.5" aria-hidden />
            0%
          </span>
        ) : delta !== null ? (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-success" : "text-destructive")}>
            {delta >= 0 ? (
              <HiOutlineArrowTrendingUp className="size-3.5" aria-hidden />
            ) : (
              <HiOutlineArrowTrendingDown className="size-3.5" aria-hidden />
            )}
            {Math.abs(delta).toFixed(0)}%
          </span>
        ) : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </div>
    </div>
  )
}

/** Cartão com título, descrição e uma ação opcional no cabeçalho. */
export function Panel({
  title,
  description,
  action,
  icon: Icon,
  children,
}: {
  title: string
  /** Ícone no início do título, na cor primária e sem fundo. */
  icon?: IconType
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-panel">
      <header className="relative flex items-start justify-between gap-3 px-4 py-3">
        {/* Divisória discreta que some nas pontas. */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-foreground/10 to-transparent" />
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon className="size-5 shrink-0 text-primary" aria-hidden /> : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
