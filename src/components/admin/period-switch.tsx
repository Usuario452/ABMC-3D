import Link from "next/link"
import { OVERVIEW_PERIODS, type OverviewPeriod } from "@/lib/data/admin"
import { cn } from "@/lib/utils"

export const DEFAULT_PERIOD: OverviewPeriod = 30

/** Lê o período da URL (7, 30 ou 90 dias); qualquer outro valor volta ao padrão. */
export function parsePeriod(value: string | string[] | undefined): OverviewPeriod {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return OVERVIEW_PERIODS.find((period) => period === parsed) ?? DEFAULT_PERIOD
}

/** Seletor de período como links: o período fica na URL e a página continua sendo renderizada no servidor. */
export function PeriodSwitch({ current, basePath }: { current: OverviewPeriod; basePath: string }) {
  return (
    <nav aria-label="Período" className="flex h-9 items-stretch gap-0.5 self-start rounded-md bg-card p-1 shadow-panel">
      {OVERVIEW_PERIODS.map((period) => (
        <Link
          key={period}
          href={period === DEFAULT_PERIOD ? basePath : `${basePath}?periodo=${period}`}
          aria-current={period === current ? "true" : undefined}
          className={cn(
            "flex items-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            period === current ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {period === 1 ? "Hoje" : `${period} dias`}
        </Link>
      ))}
    </nav>
  )
}
