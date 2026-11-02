import type { Metadata } from "next"
import Link from "next/link"
import {
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineFunnel,
  HiOutlineGlobeAlt,
  HiOutlinePlus,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
  HiOutlineSignal,
  HiOutlineUsers,
} from "react-icons/hi2"
import { FunnelChart, RevenueChart, SourcesChart, TrafficChart } from "@/components/admin/dashboard-charts"
import { Kpi, Panel } from "@/components/admin/dashboard-parts"
import { PageHeader } from "@/components/admin/page-header"
import { PeriodSwitch, parsePeriod } from "@/components/admin/period-switch"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { Button } from "@/components/ui/button"
import { requireAdminPage } from "@/lib/auth/admin"
import {
  ACTIVE_WINDOW_MINUTES,
  getDashboardOverview,
  type DashboardOverview,
} from "@/lib/data/admin"
import { formatPrice } from "@/lib/format"

export const metadata: Metadata = { title: "Visão geral" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

const SOURCE_LABELS: Record<string, string> = { direto: "Acesso direto" }

const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")}%`

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireAdminPage()
  const days = parsePeriod((await searchParams).periodo)

  let overview: DashboardOverview | null = null
  try {
    overview = await getDashboardOverview(days)
  } catch {
    overview = null
  }

  const period = overview?.period
  const previous = overview?.previous
  // Conversão: pedidos sobre sessões. Ticket médio: faturamento sobre pedidos.
  const conversion = period ? (period.sessions > 0 ? (period.orders / period.sessions) * 100 : 0) : undefined
  const previousConversion = previous ? (previous.sessions > 0 ? (previous.orders / previous.sessions) * 100 : 0) : undefined
  const ticket = period ? (period.orders > 0 ? period.revenueCents / period.orders : 0) : undefined
  const previousTicket = previous ? (previous.orders > 0 ? previous.revenueCents / previous.orders : 0) : undefined
  const abandonedShare = period && period.cartSessions > 0 ? (period.abandonedCarts / period.cartSessions) * 100 : null

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={days === 1 ? "Desempenho da loja hoje, comparado a ontem." : `Desempenho da loja nos últimos ${days} dias, comparado ao período anterior.`}
        actions={
          <>
            <PeriodSwitch current={days} basePath="/admin" />
            <Button asChild>
              <Link href="/admin/produtos/novo">
                <HiOutlinePlus aria-hidden />
                Novo produto
              </Link>
            </Button>
          </>
        }
      />

      {overview === null ? (
        <ToastOnMount
          id="dashboard-erro"
          variant="error"
          message="Não foi possível carregar os números"
          description="Verifique a conexão com o banco de dados e se as migrations foram executadas (npm run db:migrate)."
        />
      ) : null}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Visitantes"
          icon={HiOutlineUsers}
          value={period?.visitors}
          previous={previous?.visitors}
          hint={period ? `${period.sessions.toLocaleString("pt-BR")} sessões` : undefined}
        />
        <Kpi
          label="Conversão"
          icon={HiOutlineArrowTrendingUp}
          value={conversion}
          previous={previousConversion}
          format={formatPercent}
          hint={period ? `${period.orders.toLocaleString("pt-BR")} pedidos / sessões` : undefined}
        />
        <Kpi
          label="Carrinho perdido"
          icon={HiOutlineShoppingCart}
          value={period?.abandonedCarts}
          previous={previous?.abandonedCarts}
          lowerIsBetter
          hint={abandonedShare === null ? "sem pedido enviado" : `${formatPercent(abandonedShare)} dos carrinhos`}
        />
        <Kpi
          label="Total de produtos"
          icon={HiOutlineCube}
          value={overview?.catalog.products}
          hint={overview ? `${overview.catalog.activeProducts.toLocaleString("pt-BR")} ativos na loja` : undefined}
        />
        <Kpi
          label="Ticket médio"
          icon={HiOutlineReceiptPercent}
          value={ticket}
          previous={previousTicket}
          format={formatPrice}
          hint={period ? `${formatPrice(period.revenueCents)} no período` : undefined}
        />
        <Kpi
          label="Ativos agora"
          icon={HiOutlineSignal}
          value={overview?.activeNow}
          hint={`nos últimos ${ACTIVE_WINDOW_MINUTES} min`}
        />
      </dl>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel icon={HiOutlineChartBar} title={days === 1 ? "Visitas e pedidos por hora" : "Visitas e pedidos por dia"} description="Visitantes únicos e pedidos enviados pelo WhatsApp.">
          <div className="h-72 p-4">{overview ? <TrafficChart series={overview.series} /> : null}</div>
        </Panel>
        <Panel icon={HiOutlineFunnel} title="Funil de conversão" description="Quantas sessões avançam de uma etapa para a outra.">
          <div className="h-72 p-4">
            {period ? (
              <FunnelChart
                sessions={period.sessions}
                productSessions={period.productSessions}
                cartSessions={period.cartSessions}
                orderSessions={period.orderSessions}
              />
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel icon={HiOutlineBanknotes} title={days === 1 ? "Faturamento por hora" : "Faturamento por dia"} description="Soma dos pedidos enviados, com os preços do momento do pedido.">
          <div className="h-72 p-4">{overview ? <RevenueChart series={overview.series} /> : null}</div>
        </Panel>
        <Panel icon={HiOutlineGlobeAlt} title="Origem das vendas" description="Sessões e pedidos por canal de entrada.">
          <div className="h-72 p-4">
            {overview ? (
              <SourcesChart sources={overview.sources.map((item) => ({ ...item, label: SOURCE_LABELS[item.label] ?? item.label }))} />
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  )
}
