import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Esqueletos das páginas do painel. Cada um imita o formato real da página (cabeçalho, KPIs, painéis,
 * tabela ou calculadora), para a troca pelo conteúdo não mexer no layout.
 */

/** Área com o anúncio "Carregando…" para leitores de tela; o desenho em si fica escondido. */
function Loading({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label}>
      <div aria-hidden>{children}</div>
      <span className="sr-only">{label}…</span>
    </div>
  )
}

/** Mesmo espaço do PageHeader: título, descrição e as ações à direita. */
function HeaderSkeleton({ actions }: { actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 sm:h-8" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

/** Seletor de período (Hoje · 7 · 30 · 90 dias). */
const PeriodSkeleton = () => <Skeleton className="h-9 w-56 rounded-md" />

function KpiSkeleton() {
  return (
    <div className="rounded-lg bg-card p-4 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-24" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}

/** Painel com cabeçalho (ícone, título, descrição) e o corpo com a altura do gráfico. */
function PanelSkeleton({ bodyClassName = "h-72", children }: { bodyClassName?: string; children?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-panel">
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <Skeleton className="size-5 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-52 max-w-full" />
        </div>
      </div>
      <div className={cn("p-4", bodyClassName)}>{children ?? <Skeleton className="size-full" />}</div>
    </div>
  )
}

/** Barras de um gráfico de colunas, mais fiéis que um bloco liso. */
function BarsSkeleton() {
  const heights = [40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 50, 85]
  return (
    <div className="flex h-full items-end gap-2 border-b border-border/60 pb-2">
      {heights.map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-sm" style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

/** Linhas de ranking: rótulo à esquerda e barra proporcional. */
function RankedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex h-full flex-col justify-around gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-3 w-24 shrink-0" />
          <Skeleton className="h-4 rounded-sm" style={{ width: `${85 - index * 14}%` }} />
        </div>
      ))}
    </div>
  )
}

/** Tabela do painel: cabeçalho, linhas com miniatura e o rodapé da paginação. */
function TableSkeleton({
  rows,
  thumb,
  columns,
}: {
  rows: number
  /** Tamanho da miniatura da primeira coluna. */
  thumb: string
  /** Larguras das colunas depois da primeira (a de ações fica sempre no fim). */
  columns: { width: string; className?: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-panel">
      <div className="flex items-center gap-4 border-b border-border/60 px-3 py-3 sm:px-4">
        <Skeleton className="h-3 w-16 flex-1 sm:max-w-16" />
        <div className="flex-1" />
        {columns.map((column, index) => (
          <Skeleton key={index} className={cn("h-3", column.width, column.className)} />
        ))}
        <span className="w-16" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-border/60 px-3 py-3 last:border-b-0 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className={cn("shrink-0 rounded-lg", thumb)} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5 max-w-56" />
              <Skeleton className="h-3 w-1/4 max-w-32" />
            </div>
          </div>
          {columns.map((column, index) => (
            <Skeleton key={index} className={cn("h-4", column.width, column.className)} />
          ))}
          <div className="flex w-16 justify-end gap-2">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-3 sm:px-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}

/** Visão geral: período, 6 KPIs e quatro painéis de gráfico. */
export function DashboardSkeleton() {
  return (
    <Loading label="Carregando visão geral">
      <HeaderSkeleton actions={<><PeriodSkeleton /><Skeleton className="h-9 w-36 rounded-md" /></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <KpiSkeleton key={index} />)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PanelSkeleton><BarsSkeleton /></PanelSkeleton>
        <PanelSkeleton><RankedSkeleton rows={4} /></PanelSkeleton>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PanelSkeleton><BarsSkeleton /></PanelSkeleton>
        <PanelSkeleton><RankedSkeleton /></PanelSkeleton>
      </div>
    </Loading>
  )
}

/** Analytics: 4 KPIs, gráfico e rosca, tabela de produtos, rankings e listas de busca. */
export function AnalyticsSkeleton() {
  return (
    <Loading label="Carregando analytics">
      <HeaderSkeleton actions={<PeriodSkeleton />} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <KpiSkeleton key={index} />)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PanelSkeleton><BarsSkeleton /></PanelSkeleton>
        <PanelSkeleton>
          <div className="flex h-full items-center justify-center">
            <Skeleton className="size-40 rounded-full" />
          </div>
        </PanelSkeleton>
      </div>
      <div className="mt-4">
        <PanelSkeleton bodyClassName="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </PanelSkeleton>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PanelSkeleton bodyClassName="h-64"><RankedSkeleton /></PanelSkeleton>
        <PanelSkeleton bodyClassName="h-64"><RankedSkeleton /></PanelSkeleton>
      </div>
    </Loading>
  )
}

/** Produtos: busca, filtros e botão no cabeçalho; tabela com foto, situação, intenções, preço e ativo. */
export function ProductsSkeleton() {
  return (
    <Loading label="Carregando produtos">
      <HeaderSkeleton
        actions={
          <>
            <Skeleton className="h-9 w-full rounded-md sm:w-72" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </>
        }
      />
      <TableSkeleton
        rows={8}
        thumb="size-12"
        columns={[
          { width: "w-20", className: "hidden lg:block" },
          { width: "w-10", className: "hidden md:block" },
          { width: "w-16", className: "hidden md:block" },
          { width: "w-9" },
        ]}
      />
    </Loading>
  )
}

/** Categorias: busca e botão no cabeçalho; tabela com capa, contagem de produtos e ativa. */
export function CategoriesSkeleton() {
  return (
    <Loading label="Carregando categorias">
      <HeaderSkeleton
        actions={
          <>
            <Skeleton className="h-9 w-full rounded-md sm:w-72" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </>
        }
      />
      <TableSkeleton rows={6} thumb="size-10" columns={[{ width: "w-8" }, { width: "w-9" }]} />
    </Loading>
  )
}

/** Campos da calculadora: rótulo e input, em duas colunas. */
function FieldsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

/** Título de grupo com o divisor, como nos grupos da calculadora. */
function GroupTitleSkeleton() {
  return (
    <div className="mb-3 flex items-center gap-3">
      <Skeleton className="h-3 w-32" />
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/**
 * Calculadora: modelos de peça, grupos de campos e margem à esquerda; resultado à direita.
 * `compact` é a versão do modal do produto, com o resultado simplificado.
 */
export function CalculatorSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid items-start gap-5",
        compact ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-[minmax(0,1fr)_400px]",
      )}
      role="status"
      aria-label="Carregando calculadora"
    >
      <div className="rounded-lg bg-card shadow-panel" aria-hidden>
        <div className="space-y-3 border-b border-border/60 px-5 py-3.5">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-32" />
            ))}
          </div>
        </div>
        <div className="space-y-6 p-5">
          <div>
            <GroupTitleSkeleton />
            <FieldsSkeleton count={4} />
          </div>
          <div>
            <GroupTitleSkeleton />
            <FieldsSkeleton count={8} />
          </div>
          <div>
            <GroupTitleSkeleton />
            <div className="flex items-end justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-4" aria-hidden>
        <div className="rounded-lg bg-card p-5 shadow-panel">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-10 w-44" />
          <div className="mt-4 grid grid-cols-2 gap-1">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-11 rounded-md" />
            ))}
          </div>
          {compact ? <Skeleton className="mt-4 h-9 w-full rounded-md" /> : null}
        </div>
        {compact ? null : (
          <>
            <div className="rounded-lg bg-card p-5 shadow-panel">
              <GroupTitleSkeleton />
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-2.5 rounded-[3px]" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-card p-5 shadow-panel">
              <GroupTitleSkeleton />
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-md" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <span className="sr-only">Carregando calculadora…</span>
    </div>
  )
}

/** Página da calculadora: cabeçalho simples e a calculadora. */
export function CalculatorPageSkeleton() {
  return (
    <div>
      <HeaderSkeleton />
      <CalculatorSkeleton />
    </div>
  )
}
