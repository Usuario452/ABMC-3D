import "server-only"

import { db } from "@/lib/db"
import { escapeLike, mapImage, type RawImage } from "@/lib/data/mappers"
import { getProductImageUrl } from "@/lib/r2"
import type { CategoryRow, ProductImage, ProductRow } from "@/types/catalog"

/**
 * Consultas do painel. Sempre sem cache e sem os filtros da vitrine (o painel
 * enxerga registros inativos). As páginas que chamam estas funções já passaram
 * por requireAdminPage().
 */

export type AdminCategory = CategoryRow & { productCount: number; coverUrl: string | null }

export type AdminProductListItem = Pick<
  ProductRow,
  "id" | "name" | "slug" | "price_cents" | "is_active" | "is_available" | "is_featured" | "updated_at"
> & {
  category: { id: string; name: string; is_active: boolean } | null
  image: ProductImage | null
  /** Intenções de compra: pessoas (sessões do navegador) que adicionaram o produto ao carrinho. */
  cartIntents: number
}

export type AdminProduct = ProductRow & { images: ProductImage[] }

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const rows = await db()<AdminCategory[]>`
    select c.*, (select count(*)::int from products p where p.category_id = c.id) as "productCount"
    from categories c
    order by c.name
  `
  return rows.map((row) => ({ ...row, coverUrl: row.cover_path ? getProductImageUrl(row.cover_path) : null }))
}

type AdminListRow = Omit<AdminProductListItem, "category" | "image"> & {
  category_id: string
  category_name: string
  category_is_active: boolean
  image: RawImage | null
}

export async function getAdminProducts(filters: { q?: string; categoryId?: string; limit?: number } = {}) {
  const sql = db()
  const rows = await sql<AdminListRow[]>`
    select p.id, p.name, p.slug, p.price_cents, p.is_active, p.is_available, p.is_featured, p.updated_at,
           c.id as category_id, c.name as category_name, c.is_active as category_is_active,
           (
             select json_build_object('id', i.id, 'storage_path', i.storage_path, 'alt_text', i.alt_text, 'position', i.position)
             from product_images i
             where i.product_id = p.id
             order by i.position
             limit 1
           ) as image,
           (
             -- Sessões distintas; eventos antigos, sem sessão, contam um cada.
             select count(distinct coalesce(e.session_id::text, e.id::text))::int
             from analytics_events e
             where e.product_id = p.id and e.type = 'add_to_cart'
           ) as "cartIntents"
    from products p
    join categories c on c.id = p.category_id
    where true
      ${filters.q ? sql`and p.name ilike ${`%${escapeLike(filters.q)}%`}` : sql``}
      ${filters.categoryId ? sql`and p.category_id = ${filters.categoryId}` : sql``}
    order by p.updated_at desc
    limit ${filters.limit ?? 500}
  `

  return rows.map(
    ({ category_id, category_name, category_is_active, image, ...product }): AdminProductListItem => ({
      ...product,
      category: { id: category_id, name: category_name, is_active: category_is_active },
      image: image ? mapImage(image) : null,
    }),
  )
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const sql = db()
  const [product] = await sql<ProductRow[]>`select * from products where id = ${id}`
  if (!product) return null

  const images = await sql<RawImage[]>`
    select id, storage_path, alt_text, position
    from product_images
    where product_id = ${id}
    order by position
  `
  return { ...product, images: images.map(mapImage) }
}

export async function getCategoryOptions() {
  const rows = await db()<{ id: string; name: string; is_active: boolean }[]>`
    select id, name, is_active from categories order by name
  `
  return [...rows]
}

// ---------------------------------------------------------------------------
// Visão geral (dashboard): catálogo + eventos da vitrine
// ---------------------------------------------------------------------------

// 1 = hoje (gráfico por hora); os demais valores são dias corridos, contando hoje.
export const OVERVIEW_PERIODS = [1, 7, 30, 90] as const
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number]

type PeriodTotals = {
  visitors: number
  sessions: number
  /** Sessões que abriram ao menos uma página de produto. */
  productSessions: number
  /** Pedidos enviados pelo WhatsApp (um por order_ref). */
  orders: number
  /** Soma dos pedidos com os preços do banco no momento do envio; o pagamento é combinado fora da loja. */
  revenueCents: number
  /** Sessões que colocaram algo no carrinho / que também enviaram pedido / que não enviaram (carrinho perdido). */
  cartSessions: number
  orderSessions: number
  abandonedCarts: number
}

export type DashboardOverview = {
  period: PeriodTotals
  previous: PeriodTotals
  /** Um ponto por dia do período (por hora em "hoje"); dias sem movimento vêm zerados. */
  series: { day: string; visitors: number; orders: number; revenueCents: number }[]
  /** Origem das sessões (campanha, site de origem ou acesso direto) e quantos pedidos cada uma gerou. */
  sources: { label: string; sessions: number; orders: number }[]
  /** Visitantes com página vista nos últimos ACTIVE_WINDOW_MINUTES minutos. */
  activeNow: number
  catalog: { products: number; activeProducts: number }
}

/** Janela de "ativos agora": a visita só é registrada ao abrir uma página, então é uma aproximação. */
export const ACTIVE_WINDOW_MINUTES = 5

/** Em "hoje" o gráfico é por hora; nos demais períodos, por dia. */
function bucketing(days: OverviewPeriod) {
  const hourly = days === 1
  return {
    hourly,
    bucketUnit: hourly ? "hour" : "day",
    bucketFormat: hourly ? "YYYY-MM-DD HH24:MI" : "YYYY-MM-DD",
  }
}

// O dia da loja segue o horário de Brasília, independentemente do fuso do servidor.
const TIME_ZONE = "America/Sao_Paulo"

export async function getDashboardOverview(days: OverviewPeriod): Promise<DashboardOverview> {
  const { hourly, bucketUnit, bucketFormat } = bucketing(days)
  // Uma única consulta devolve tudo em JSON: com o banco remoto, cada ida ao servidor custa caro.
  // Tráfego vem de site_visits (a mesma fonte da tela Visitantes); carrinho e pedidos, de analytics_events,
  // ligados à visita pelo session_id. "p" marca o período: 'cur' (atual) ou 'prev' (imediatamente anterior).
  const [row] = await db()<DashboardOverview[]>`
    with
    today as (select (now() at time zone ${TIME_ZONE})::date as d),
    v as (
      select s.visitor_id, s.session_id, s.is_entry, s.path ~ '^/produtos/[^/?#]+' as is_product,
             coalesce(s.utm_source, s.referrer_host, 'direto') as source,
             date_trunc(${bucketUnit}::text, s.created_at at time zone ${TIME_ZONE}) as bucket,
             case
               when (s.created_at at time zone ${TIME_ZONE})::date > t.d - ${days}::int then 'cur'
               when (s.created_at at time zone ${TIME_ZONE})::date > t.d - ${days * 2}::int then 'prev'
             end as p
      from site_visits s, today t
      where s.created_at >= now() - (${days * 2 + 1}::int * interval '1 day')
    ),
    e as (
      select x.type, x.session_id, x.order_ref, x.value_cents,
             date_trunc(${bucketUnit}::text, x.created_at at time zone ${TIME_ZONE}) as bucket,
             case
               when (x.created_at at time zone ${TIME_ZONE})::date > t.d - ${days}::int then 'cur'
               when (x.created_at at time zone ${TIME_ZONE})::date > t.d - ${days * 2}::int then 'prev'
             end as p
      from analytics_events x, today t
      where x.created_at >= now() - (${days * 2 + 1}::int * interval '1 day')
        and x.type in ('add_to_cart', 'checkout_whatsapp')
    ),
    periods as (select unnest(array['cur', 'prev']) as p),
    traffic as (
      select p, count(distinct visitor_id) as visitors, count(distinct session_id) as sessions,
             count(distinct session_id) filter (where is_product) as product_sessions
      from v where p is not null group by p
    ),
    sales as (
      select p,
             count(distinct order_ref) filter (where type = 'checkout_whatsapp') as orders,
             coalesce(sum(value_cents) filter (where type = 'checkout_whatsapp'), 0) as revenue
      from e where p is not null group by p
    ),
    -- Carrinho perdido: sessão que adicionou itens e não enviou pedido. Eventos sem sessão (antigos) ficam de fora.
    carts as (
      select p,
             count(*) filter (where carted) as cart_sessions,
             count(*) filter (where ordered) as order_sessions,
             count(*) filter (where carted and not ordered) as abandoned
      from (
        select p, session_id,
               bool_or(type = 'add_to_cart') as carted,
               bool_or(type = 'checkout_whatsapp') as ordered
        from e where p is not null and session_id is not null
        group by p, session_id
      ) s
      group by p
    ),
    totals as (
      select pr.p, json_build_object(
        'visitors', coalesce(t.visitors, 0),
        'sessions', coalesce(t.sessions, 0),
        'productSessions', coalesce(t.product_sessions, 0),
        'orders', coalesce(s.orders, 0),
        'revenueCents', coalesce(s.revenue, 0),
        'cartSessions', coalesce(c.cart_sessions, 0),
        'orderSessions', coalesce(c.order_sessions, 0),
        'abandonedCarts', coalesce(c.abandoned, 0)
      ) as j
      from periods pr
      left join traffic t on t.p = pr.p
      left join sales s on s.p = pr.p
      left join carts c on c.p = pr.p
    ),
    per_bucket as (
      select g.bucket,
             (select count(distinct visitor_id) from v where v.p = 'cur' and v.bucket = g.bucket) as visitors,
             (select count(distinct order_ref) from e where e.p = 'cur' and e.bucket = g.bucket and e.type = 'checkout_whatsapp') as orders,
             (select coalesce(sum(value_cents), 0) from e where e.p = 'cur' and e.bucket = g.bucket and e.type = 'checkout_whatsapp') as revenue
      from (
        select generate_series(
          case when ${hourly}::boolean then date_trunc('day', now() at time zone ${TIME_ZONE}) else (t.d - ${days - 1}::int)::timestamp end,
          case when ${hourly}::boolean then date_trunc('hour', now() at time zone ${TIME_ZONE}) else t.d::timestamp end,
          case when ${hourly}::boolean then interval '1 hour' else interval '1 day' end
        ) as bucket from today t
      ) g
    ),
    series as (
      select json_agg(json_build_object(
        'day', to_char(bucket, ${bucketFormat}),
        'visitors', visitors,
        'orders', orders,
        'revenueCents', revenue
      ) order by bucket) as j
      from per_bucket
    ),
    sources as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select en.source as label, count(*) as sessions, coalesce(sum(o.orders), 0) as orders
        from (select distinct on (session_id) session_id, source from v where p = 'cur' and is_entry order by session_id) en
        left join (
          select session_id, count(distinct order_ref) as orders
          from e where p = 'cur' and type = 'checkout_whatsapp' and session_id is not null
          group by session_id
        ) o on o.session_id = en.session_id
        group by en.source
        order by sessions desc, label
        limit 6
      ) r
    )
    select
      (select j from totals where p = 'cur') as period,
      (select j from totals where p = 'prev') as previous,
      (select j from series) as series,
      (select j from sources) as sources,
      (select count(distinct visitor_id)::int from site_visits
        where created_at >= now() - (${ACTIVE_WINDOW_MINUTES}::int * interval '1 minute')) as "activeNow",
      json_build_object(
        'products', (select count(*) from products),
        'activeProducts', (select count(*) from products where is_active)
      ) as catalog
  `

  return row
}

// ---------------------------------------------------------------------------
// Visitantes: tráfego, origem, região, fluxo e buscas do catálogo
// ---------------------------------------------------------------------------

type VisitTotals = {
  visitors: number
  sessions: number
  pageviews: number
  newVisitors: number
  bounced: number
}

type Ranked = { label: string; value: number }

export type ProductPerformance = {
  id: string
  name: string
  slug: string
  isActive: boolean
  category: string
  imageUrl: string | null
  /** Visualizações da página do produto (uma por aba), itens adicionados ao carrinho e pedidos. */
  views: number
  cartAdds: number
  orders: number
  revenueCents: number
}

export type VisitorsOverview = {
  period: VisitTotals
  previous: VisitTotals
  series: { day: string; visitors: number; pageviews: number }[]
  sources: Ranked[]
  cities: Ranked[]
  devices: Ranked[]
  search: {
    top: { query: string; searches: number; results: number }[]
    notFound: { query: string; searches: number }[]
  }
  /** Todos os produtos cadastrados, dos mais vistos para os menos vistos. */
  products: ProductPerformance[]
}

export async function getVisitorsOverview(days: OverviewPeriod): Promise<VisitorsOverview> {
  const { hourly, bucketUnit, bucketFormat } = bucketing(days)
  // Uma única consulta devolve tudo em JSON: com o banco remoto, cada ida ao servidor custa caro.
  const [row] = await db()<
    (Omit<VisitorsOverview, "products"> & { products: (Omit<ProductPerformance, "imageUrl"> & { imagePath: string | null })[] })[]
  >`
    with
    today as (select (now() at time zone ${TIME_ZONE})::date as d),
    v as (
      select s.visitor_id, s.session_id, s.path, s.is_entry, s.is_new_visitor, s.referrer_host, s.utm_source,
             s.country, s.region, s.city, s.device, s.browser, s.created_at,
             (s.created_at at time zone ${TIME_ZONE})::date as day,
             date_trunc(${bucketUnit}::text, s.created_at at time zone ${TIME_ZONE}) as bucket
      from site_visits s
      where s.created_at >= now() - (${days * 2 + 1}::int * interval '1 day')
    ),
    cur as (select v.* from v, today t where v.day > t.d - ${days}::int),
    prev as (select v.* from v, today t where v.day <= t.d - ${days}::int and v.day > t.d - ${days * 2}::int),
    cur_totals as (
      select json_build_object(
        'visitors', count(distinct visitor_id),
        'sessions', count(distinct session_id),
        'pageviews', count(*),
        'newVisitors', count(distinct visitor_id) filter (where is_new_visitor),
        'bounced', (select count(*) from (select 1 from cur group by session_id having count(*) = 1) b)
      ) as j from cur
    ),
    prev_totals as (
      select json_build_object(
        'visitors', count(distinct visitor_id),
        'sessions', count(distinct session_id),
        'pageviews', count(*),
        'newVisitors', count(distinct visitor_id) filter (where is_new_visitor),
        'bounced', (select count(*) from (select 1 from prev group by session_id having count(*) = 1) b)
      ) as j from prev
    ),
    per_day as (
      select bucket, count(distinct visitor_id) as visitors, count(*) as pageviews from cur group by bucket
    ),
    series as (
      select json_agg(json_build_object(
        'day', to_char(g.bucket, ${bucketFormat}),
        'visitors', coalesce(x.visitors, 0),
        'pageviews', coalesce(x.pageviews, 0)
      ) order by g.bucket) as j
      from (
        select generate_series(
          case when ${hourly}::boolean then date_trunc('day', now() at time zone ${TIME_ZONE}) else (t.d - ${days - 1}::int)::timestamp end,
          case when ${hourly}::boolean then date_trunc('hour', now() at time zone ${TIME_ZONE}) else t.d::timestamp end,
          case when ${hourly}::boolean then interval '1 hour' else interval '1 day' end
        ) as bucket from today t
      ) g
      left join per_day x on x.bucket = g.bucket
    ),
    sources as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select coalesce(utm_source, referrer_host, 'direto') as label, count(*) as value
        from cur where is_entry group by 1 order by value desc, label limit 8
      ) r
    ),
    cities as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select city || coalesce(', ' || region, '') as label, count(distinct visitor_id) as value
        from cur where city is not null group by city, region order by value desc, label limit 8
      ) r
    ),
    devices as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select device as label, count(distinct visitor_id) as value from cur group by device order by value desc
      ) r
    ),
    ce as (
      select c.type, c.query, c.category_slug, c.results_count
      from catalog_events c, today t
      where (c.created_at at time zone ${TIME_ZONE})::date > (now() at time zone ${TIME_ZONE})::date - ${days}::int
    ),
    top_searches as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select query, count(*) as searches, round(avg(results_count))::int as results
        from ce where type = 'search' group by query order by searches desc, query limit 8
      ) r
    ),
    not_found as (
      select coalesce(json_agg(r), '[]'::json) as j from (
        select query, count(*) as searches
        from ce where type = 'search' and results_count = 0 group by query order by searches desc, query limit 8
      ) r
    ),
    -- Desempenho de cada produto cadastrado, pelo ID gravado nos eventos (não pelo link da página).
    pe as (
      select x.product_id, x.type, x.quantity, x.value_cents, x.order_ref
      from analytics_events x, today t
      where x.product_id is not null
        and (x.created_at at time zone ${TIME_ZONE})::date > t.d - ${days}::int
    ),
    products_perf as (
      select coalesce(json_agg(r order by r.views desc, r."cartAdds" desc, r.name), '[]'::json) as j from (
        select p.id, p.name, p.slug, p.is_active as "isActive", c.name as category,
               (select i.storage_path from product_images i where i.product_id = p.id order by i.position limit 1) as "imagePath",
               count(pe.type) filter (where pe.type = 'product_view') as views,
               count(pe.type) filter (where pe.type = 'add_to_cart') as "cartAdds",
               count(distinct pe.order_ref) filter (where pe.type = 'checkout_whatsapp') as orders,
               coalesce(sum(pe.value_cents) filter (where pe.type = 'checkout_whatsapp'), 0) as "revenueCents"
        from products p
        join categories c on c.id = p.category_id
        left join pe on pe.product_id = p.id
        group by p.id, c.name
      ) r
    )
    select
      (select j from cur_totals) as period,
      (select j from prev_totals) as previous,
      (select j from series) as series,
      (select j from sources) as sources,
      (select j from cities) as cities,
      (select j from devices) as devices,
      json_build_object(
        'top', (select j from top_searches),
        'notFound', (select j from not_found)
      ) as search,
      (select j from products_perf) as products
  `

  const { products, ...rest } = row
  return {
    ...rest,
    products: products.map(({ imagePath, ...product }) => ({
      ...product,
      imageUrl: imagePath ? getProductImageUrl(imagePath) : null,
    })),
  }
}
