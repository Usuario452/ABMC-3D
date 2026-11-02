"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AXIS,
  ChartTooltip,
  Empty,
  GOLD,
  SECONDARY,
  GRID,
  SLICES,
  formatDay,
} from "@/components/admin/dashboard-charts"
import type { VisitorsOverview } from "@/lib/data/admin"

/** Visitantes únicos e páginas vistas por dia. */
export function VisitorsChart({ series }: { series: VisitorsOverview["series"] }) {
  if (!series.some((point) => point.visitors || point.pageviews)) {
    return <Empty>Ainda não há visitas registradas neste período.</Empty>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="fill-visitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fill-pageviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SECONDARY} stopOpacity={0.3} />
            <stop offset="100%" stopColor={SECONDARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={formatDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<ChartTooltip />} labelFormatter={(day) => formatDay(String(day))} cursor={{ stroke: GRID }} />
        <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area type="monotone" dataKey="pageviews" name="Páginas vistas" stroke={SECONDARY} strokeWidth={2} fill="url(#fill-pageviews)" />
        <Area type="monotone" dataKey="visitors" name="Visitantes" stroke={GOLD} strokeWidth={2} fill="url(#fill-visitors)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Ranking em barras horizontais (páginas, origens, cidades, categorias…). */
export function RankedBarsChart({
  data,
  name,
  empty,
  labelWidth = 130,
}: {
  data: { label: string; value: number }[]
  name: string
  empty: string
  labelWidth?: number
}) {
  if (data.length === 0) return <Empty>{empty}</Empty>

  const rows = data.map((item) => ({ ...item, short: truncate(item.label, Math.round(labelWidth / 6.2)) }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }}>
        {/* Folga à direita para o número ao fim da barra mais longa não ser cortado. */}
        <XAxis type="number" hide allowDecimals={false} domain={[0, (max: number) => Math.ceil(max * 1.2)]} />
        <YAxis type="category" dataKey="short" tick={AXIS} tickLine={false} axisLine={false} width={labelWidth} interval={0} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
        <Bar dataKey="value" name={name} fill={GOLD} radius={[0, 6, 6, 0]} barSize={14} label={{ position: "right", fontSize: 11, fill: "var(--foreground)" }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Rosca com legenda ao lado. */
export function DonutChart({ data, empty }: { data: { label: string; value: number }[]; empty: string }) {
  if (data.length === 0) return <Empty>{empty}</Empty>

  return (
    <div className="flex h-full items-center gap-4">
      <div className="h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={SLICES[index % SLICES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-36 shrink-0 space-y-2 text-xs">
        {data.map((entry, index) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: SLICES[index % SLICES.length] }} />
            <span className="truncate text-muted-foreground">{entry.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
