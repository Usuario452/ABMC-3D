import type { Metadata } from "next"
import {
  HiOutlineArrowUturnLeft,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineDevicePhoneMobile,
  HiOutlineGlobeAlt,
  HiOutlineMagnifyingGlass,
  HiOutlineMapPin,
  HiOutlineQuestionMarkCircle,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi2"
import { Kpi, Panel } from "@/components/admin/dashboard-parts"
import { PageHeader } from "@/components/admin/page-header"
import { PeriodSwitch, parsePeriod } from "@/components/admin/period-switch"
import { ProductPerformanceTable } from "@/components/admin/product-performance"
import { DonutChart, RankedBarsChart, VisitorsChart } from "@/components/admin/visitors-charts"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { requireAdminPage } from "@/lib/auth/admin"
import { getVisitorsOverview, type VisitorsOverview } from "@/lib/data/admin"

export const metadata: Metadata = { title: "Analytics" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

const DEVICE_LABELS: Record<string, string> = { desktop: "Computador", mobile: "Celular", tablet: "Tablet", other: "Outro" }
const SOURCE_LABELS: Record<string, string> = { direto: "Acesso direto" }

const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : undefined)
const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")}%`

/** Lista simples de termos buscados, com a contagem à direita. */
function SearchList({
  items,
  empty,
  tone,
}: {
  items: { query: string; searches: number; results?: number }[]
  empty: string
  tone?: "destructive"
}) {
  if (items.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item.query} className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5 text-sm first:border-t-0">
          <span className="min-w-0 flex-1 truncate">{item.query}</span>
          {item.results !== undefined ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {item.results} {item.results === 1 ? "resultado" : "resultados"}
            </span>
          ) : null}
          <span className={`w-8 shrink-0 text-right font-semibold tabular-nums ${tone === "destructive" ? "text-destructive" : ""}`}>
            {item.searches}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdminPage()
  const days = parsePeriod((await searchParams).periodo)

  let data: VisitorsOverview | null = null
  try {
    data = await getVisitorsOverview(days)
  } catch {
    data = null
  }

  const { period, previous } = data ?? {}
  const pagesPerSession = period && period.sessions > 0 ? period.pageviews / period.sessions : undefined
  const previousPages = previous && previous.sessions > 0 ? previous.pageviews / previous.sessions : undefined
  const bounce = period ? percent(period.bounced, period.sessions) : undefined
  const previousBounce = previous ? percent(previous.bounced, previous.sessions) : undefined
  const newShare = period ? percent(period.newVisitors, period.visitors) : undefined

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Visitas, produtos e buscas da loja."
        actions={<PeriodSwitch current={days} basePath="/admin/analytics" />}
      />

      {data === null ? (
        <ToastOnMount
          id="analytics-erro"
          variant="error"
          message="Não foi possível carregar os números"
          description="Verifique a conexão com o banco de dados e se as migrations foram executadas (npm run db:migrate)."
        />
      ) : null}

      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Visitantes"
          icon={HiOutlineUsers}
          value={period?.visitors}
          previous={previous?.visitors}
          hint={period ? `${period.sessions.toLocaleString("pt-BR")} sessões` : undefined}
        />
        <Kpi
          label="Novos visitantes"
          icon={HiOutlineSparkles}
          value={newShare}
          format={formatPercent}
          hint={period ? `${period.newVisitors.toLocaleString("pt-BR")} primeira visita` : undefined}
        />
        <Kpi
          label="Páginas por sessão"
          icon={HiOutlineUserGroup}
          value={pagesPerSession}
          previous={previousPages}
          format={(value) => value.toFixed(1).replace(".", ",")}
          hint="em média"
        />
        <Kpi
          label="Rejeição"
          icon={HiOutlineArrowUturnLeft}
          value={bounce}
          previous={previousBounce}
          format={formatPercent}
          lowerIsBetter
          hint="saem na 1ª página"
        />
      </dl>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel icon={HiOutlineChartBar} title={days === 1 ? "Visitantes por hora" : "Visitantes por dia"} description="Visitantes únicos e páginas vistas.">
          <div className="h-72 p-4">{data ? <VisitorsChart series={data.series} /> : null}</div>
        </Panel>
        <Panel icon={HiOutlineDevicePhoneMobile} title="Dispositivos" description="Como as pessoas acessam a loja.">
          <div className="h-72 p-4">
            {data ? (
              <DonutChart
                data={data.devices.map((item) => ({ ...item, label: DEVICE_LABELS[item.label] ?? item.label }))}
                empty="Os dispositivos aparecem aqui."
              />
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel icon={HiOutlineCube} title="Produtos" description="Visualizações, carrinho e pedidos de cada produto cadastrado. Clique numa coluna para ordenar.">
          {data ? <ProductPerformanceTable products={data.products} /> : null}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel icon={HiOutlineGlobeAlt} title="Origem do tráfego" description="Campanha, site de origem ou acesso direto.">
          <div className="h-64 p-4">
            {data ? (
              <RankedBarsChart
                data={data.sources.map((item) => ({ ...item, label: SOURCE_LABELS[item.label] ?? item.label }))}
                name="Sessões"
                empty="A origem das visitas aparece aqui."
                labelWidth={140}
              />
            ) : null}
          </div>
        </Panel>
        <Panel icon={HiOutlineMapPin} title="Cidades" description="Visitantes únicos por cidade.">
          <div className="h-64 p-4">
            {data ? (
              <RankedBarsChart
                data={data.cities}
                name="Visitantes"
                empty="As cidades aparecem quando a loja estiver publicada (a hospedagem informa o local)."
                labelWidth={150}
              />
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel icon={HiOutlineMagnifyingGlass} title="Mais buscado" description="Termos pesquisados no catálogo e quantos produtos apareceram.">
          <SearchList items={data?.search.top ?? []} empty="As buscas feitas no catálogo aparecem aqui." />
        </Panel>
        <Panel icon={HiOutlineQuestionMarkCircle} title="Buscas sem resultado" description="O que procuraram e não encontraram: ideias de novos produtos.">
          <SearchList
            items={data?.search.notFound ?? []}
            empty="Nenhuma busca ficou sem resultado neste período."
            tone="destructive"
          />
        </Panel>
      </div>
    </>
  )
}
