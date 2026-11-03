"use client"

import type { ReactNode } from "react"
import { HiArrowDown } from "react-icons/hi2"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DashboardOverview } from "@/lib/data/admin"
import { formatPrice } from "@/lib/format"

export const GOLD = "var(--brand-gold)"
/** Cor da série secundária, para não confundir com o dourado da principal. */
export const SECONDARY = "var(--chart-cat-2)"
export const SUCCESS = "var(--success)"
export const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" }
export const GRID = "var(--border)"

/** Paleta das fatias da rosca: abre no dourado da marca e segue com cores distintas, ajustadas por tema. */
export const SLICES = [1, 2, 3, 4, 5, 6].map((n) => `var(--chart-cat-${n})`)

type TooltipItem = { name?: string; value?: number | string; color?: string; dataKey?: string | number }

export function ChartTooltip({
  active,
  label,
  payload,
  format = (value) => value,
}: {
  active?: boolean
  label?: string | number
  payload?: TooltipItem[]
  /** Formata o valor de cada série (ex.: moeda). */
  format?: (value: number | string) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label !== undefined ? <p className="mb-1 font-medium">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center gap-2">
            <span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{item.value === undefined ? null : format(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">{children}</div>
}

// "AAAA-MM-DD" vira DD/MM; "AAAA-MM-DD HH:MM" (gráfico por hora) vira HH:MM.
export const formatDay = (day: string) =>
  day.length > 10 ? day.slice(11, 16) : `${day.slice(8, 10)}/${day.slice(5, 7)}`

/** Visitantes e pedidos por dia; os pedidos têm eixo próprio, à direita, por serem bem menos numerosos. */
export function TrafficChart({ series }: { series: DashboardOverview["series"] }) {
  const hasData = series.some((point) => point.visitors || point.orders)
  if (!hasData) return <Empty>Ainda não há visitas registradas neste período.</Empty>

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={series} margin={{ top: 8, right: 0, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fill-visitors-dash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={formatDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis yAxisId="visits" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={44} />
        <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={32} />
        <Tooltip content={<ChartTooltip />} labelFormatter={(day) => formatDay(String(day))} cursor={{ stroke: GRID }} />
        <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area yAxisId="visits" type="monotone" dataKey="visitors" name="Visitantes" stroke={GOLD} strokeWidth={2} fill="url(#fill-visitors-dash)" />
        <Line yAxisId="orders" type="monotone" dataKey="orders" name="Pedidos" stroke={SUCCESS} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/**
 * Funil por sessão: cada etapa mostra o total, a parte das sessões que chegou até ali (barra) e,
 * entre as etapas, quantos avançaram da anterior. Feito em HTML: etapas zeradas continuam visíveis.
 */
export function FunnelChart({
  sessions,
  productSessions,
  cartSessions,
  orderSessions,
}: {
  sessions: number
  productSessions: number
  cartSessions: number
  orderSessions: number
}) {
  if (!sessions) return <Empty>O funil aparece assim que a loja receber visitas.</Empty>

  const steps = [
    { label: "Sessões", value: sessions, color: GOLD },
    { label: "Viram um produto", value: productSessions, color: "var(--chart-cat-3)" },
    { label: "Colocaram no carrinho", value: cartSessions, color: SECONDARY },
    { label: "Enviaram pedido", value: orderSessions, color: SUCCESS },
  ]
  const percent = (part: number, total: number) =>
    `${(total > 0 ? (part / total) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

  return (
    <ol className="flex h-full flex-col justify-between">
      {steps.map((step, index) => {
        const previous = steps[index - 1]
        return (
          <li key={step.label}>
            {previous ? (
              <p className="mb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <HiArrowDown className="size-3" aria-hidden />
                <span className="font-medium text-foreground tabular-nums">{percent(step.value, previous.value)}</span>
                avançaram
              </p>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{step.value.toLocaleString("pt-BR")}</span>
                <span className="ml-1.5 text-muted-foreground">{percent(step.value, sessions)}</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/8">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(step.value / sessions) * 100}%`, background: step.color }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const compactCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" })

/** Faturamento estimado (soma dos pedidos enviados) por dia. */
export function RevenueChart({ series }: { series: DashboardOverview["series"] }) {
  if (!series.some((point) => point.revenueCents)) return <Empty>O faturamento aparece quando chegarem os primeiros pedidos.</Empty>

  const data = series.map((point) => ({ day: point.day, revenue: point.revenueCents / 100 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={formatDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={(value: number) => compactCurrency.format(value)} tick={AXIS} tickLine={false} axisLine={false} width={64} />
        <Tooltip
          content={<ChartTooltip format={(value) => formatPrice(Number(value) * 100)} />}
          labelFormatter={(day) => formatDay(String(day))}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        <Bar dataKey="revenue" name="Faturamento" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** De onde vêm as sessões e quantos pedidos cada origem gerou. */
export function SourcesChart({ sources }: { sources: DashboardOverview["sources"] }) {
  if (sources.length === 0) return <Empty>A origem das visitas aparece aqui.</Empty>

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sources} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="sessions" name="Sessões" fill={GOLD} radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="orders" name="Pedidos" fill={SUCCESS} radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  )
}
