import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { siteConfig } from "@/config/site"
import { db, withScopedDb, type Sql } from "@/lib/db"
import { escapeLike, mapImage, type RawImage } from "@/lib/data/mappers"
import { getProductImageUrl } from "@/lib/r2"
import type {
  CatalogFacets,
  CatalogPage,
  CatalogQuery,
  CategorySummary,
  ProductCardData,
  ProductDetail,
} from "@/types/catalog"

/**
 * Consultas da vitrine pública. Ficam em cache no servidor com a tag CATALOG_TAG;
 * o painel invalida a tag a cada alteração. Toda consulta pública aplica as regras
 * de visibilidade: produto ativo e disponível, de categoria ativa.
 *
 * As funções em cache nunca lançam exceções: retornam { ok: false } em caso de
 * falha, com um tempo de cache mínimo — assim a falha não fica gravada e a
 * consulta é refeita na próxima requisição.
 */
export const CATALOG_TAG = "catalog"

export type Cached<T> = { ok: true; data: T } | { ok: false }

/** revalidate 0: resultado de falha não é reaproveitado nem pré-renderizado. */
const FAILURE_LIFE = { stale: 0, revalidate: 0, expire: 60 }

async function settle<T>(context: string, query: (sql: Sql) => Promise<T>): Promise<Cached<T>> {
  try {
    const data = await withScopedDb(query)
    cacheLife("catalog")
    return { ok: true, data }
  } catch (error) {
    cacheLife(FAILURE_LIFE)
    console.error(`[catalogo] Falha ao carregar ${context}:`, error instanceof Error ? error.message : error)
    return { ok: false }
  }
}

type CardRow = {
  id: string
  name: string
  slug: string
  price_cents: number
  is_available: boolean
  category_id: string
  category_name: string
  category_slug: string
  image_id: string | null
  image_path: string | null
  image_alt: string | null
  image_position: number | null
}

function toCard(row: CardRow): ProductCardData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceCents: row.price_cents,
    isAvailable: row.is_available,
    category: { id: row.category_id, name: row.category_name, slug: row.category_slug },
    image:
      row.image_id && row.image_path
        ? mapImage({
            id: row.image_id,
            storage_path: row.image_path,
            alt_text: row.image_alt ?? "",
            position: row.image_position ?? 0,
          })
        : null,
  }
}

/**
 * Categoria de exibição do produto ("c"): a primeira ativa entre as suas, na ordem escolhida. Serve também
 * de filtro de visibilidade: sem nenhuma categoria ativa, o produto não aparece na loja.
 */
function activeCategory(sql: Sql) {
  return sql`
    join lateral (
      select cat.id, cat.name, cat.slug
      from product_categories pc
      join categories cat on cat.id = pc.category_id and cat.is_active
      where pc.product_id = p.id
      order by pc.position
      limit 1
    ) c on true
  `
}

type FilterKey = "category" | "price" | "featured" | "recent"

/**
 * Filtros da listagem como trecho SQL ("and …", sobre "p"). `omit` deixa de fora os filtros de uma faceta,
 * para a contagem dela mostrar quantos produtos cada opção traria (como no Mercado Livre).
 */
function catalogFilters(sql: Sql, query: CatalogQuery, omit: Partial<Record<FilterKey, true>> = {}) {
  return sql`
    ${
      query.category && !omit.category
        ? sql`and exists (
            select 1 from product_categories fpc
            join categories fc on fc.id = fpc.category_id and fc.is_active
            where fpc.product_id = p.id and fc.slug = ${query.category}
          )`
        : sql``
    }
    ${query.q ? sql`and p.name ilike ${`%${escapeLike(query.q)}%`}` : sql``}
    ${!omit.price && query.minPrice !== null ? sql`and p.price_cents >= ${query.minPrice * 100}` : sql``}
    ${!omit.price && query.maxPrice !== null ? sql`and p.price_cents <= ${query.maxPrice * 100}` : sql``}
    ${!omit.featured && query.featured ? sql`and p.is_featured` : sql``}
    ${!omit.recent && query.recent ? sql`and ${isRecent(sql)}` : sql``}
  `
}

function isRecent(sql: Sql) {
  return sql`p.created_at >= now() - make_interval(days => ${siteConfig.catalog.newDays})`
}

/** Produto visível na vitrine: ativo, disponível e com ao menos uma categoria ativa. */
function isVisible(sql: Sql) {
  return sql`
    p.is_active and p.is_available and exists (
      select 1 from product_categories vpc
      join categories vc on vc.id = vpc.category_id and vc.is_active
      where vpc.product_id = p.id
    )
  `
}

/** Produtos visíveis na vitrine, com a categoria e a imagem principal (menor position). */
function publicCards(sql: Sql, where = sql``, orderLimit = sql``) {
  return sql<CardRow[]>`
    select p.id, p.name, p.slug, p.price_cents, p.is_available,
           c.id as category_id, c.name as category_name, c.slug as category_slug,
           i.id as image_id, i.storage_path as image_path, i.alt_text as image_alt, i.position as image_position
    from products p
    ${activeCategory(sql)}
    left join lateral (
      select id, storage_path, alt_text, position
      from product_images
      where product_id = p.id
      order by position
      limit 1
    ) i on true
    where p.is_active and p.is_available ${where}
    ${orderLimit}
  `
}

// ---------------------------------------------------------------------------
// Consultas em cache
// ---------------------------------------------------------------------------

export async function getActiveCategories(): Promise<Cached<CategorySummary[]>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("as categorias", async (sql) => {
    const rows = await sql<CategorySummary[]>`
      select id, name, slug from categories where is_active order by name
    `
    return [...rows]
  })
}

export type CategoryShowcase = CategorySummary & { description: string | null; coverUrl: string | null }

/** Uma categoria ativa pelo id, com descrição e capa (null se não existir ou estiver inativa). */
export async function getCategoryById(id: string): Promise<Cached<CategoryShowcase | null>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("a categoria", async (sql) => {
    const [row] = await sql<{ id: string; name: string; slug: string; description: string | null; cover_path: string | null }[]>`
      select c.id, c.name, c.slug, c.description, c.cover_path
      from categories c
      where c.id = ${id} and c.is_active
    `
    if (!row) return null
    const { cover_path, ...category } = row
    return { ...category, coverUrl: cover_path ? getProductImageUrl(cover_path) : null }
  })
}

/** Categorias da vitrine da home: todas as ativas, com descrição e capa. */
export async function getShowcaseCategories(): Promise<Cached<CategoryShowcase[]>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("as categorias", async (sql) => {
    const rows = await sql<{ id: string; name: string; slug: string; description: string | null; cover_path: string | null }[]>`
      select c.id, c.name, c.slug, c.description, c.cover_path
      from categories c
      where c.is_active
      order by c.name
    `
    return rows.map(({ cover_path, ...category }) => ({
      ...category,
      coverUrl: cover_path ? getProductImageUrl(cover_path) : null,
    }))
  })
}

export async function getHomeProducts(): Promise<
  Cached<{ kind: "featured" | "latest"; products: ProductCardData[] }>
> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("os destaques", async (sql) => {
    const limit = siteConfig.catalog.featuredLimit

    const featured = await publicCards(sql, sql`and p.is_featured`, sql`order by p.created_at desc limit ${limit}`)
    if (featured.length > 0) {
      return { kind: "featured" as const, products: featured.map(toCard) }
    }

    const latest = await publicCards(sql, sql``, sql`order by p.created_at desc limit ${limit}`)
    return { kind: "latest" as const, products: latest.map(toCard) }
  })
}

export async function getCatalogPage(query: CatalogQuery): Promise<Cached<CatalogPage>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("o catálogo", async (sql) => {
    const pageSize = siteConfig.catalog.pageSize
    const offset = (query.page - 1) * pageSize

    const filters = catalogFilters(sql, query)

    // Ordenações fixas (nunca texto do usuário); p.id desempata para a paginação ser estável.
    const order = {
      "nome-asc": sql`order by p.name asc, p.id`,
      "nome-desc": sql`order by p.name desc, p.id`,
      "preco-asc": sql`order by p.price_cents asc, p.name, p.id`,
      "preco-desc": sql`order by p.price_cents desc, p.name, p.id`,
      recentes: sql`order by p.created_at desc, p.id`,
    }[query.sort]

    const [rows, [{ total }]] = await Promise.all([
      publicCards(sql, filters, sql`${order} limit ${pageSize} offset ${offset}`),
      sql<{ total: number }[]>`
        select count(*)::int as total
        from products p
        ${activeCategory(sql)}
        where p.is_active and p.is_available ${filters}
      `,
    ])

    return {
      products: rows.map(toCard),
      total,
      page: query.page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    }
  })
}

/** Contagens da coluna de filtros: categorias, faixas de preço, destaques e novidades. */
export async function getCatalogFacets(query: CatalogQuery): Promise<Cached<CatalogFacets>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("os filtros", async (sql) => {
    const ranges = siteConfig.catalog.priceRanges
    // -1 = sem limite (evita null dentro do array).
    const mins = ranges.map((range) => (range.min ?? -1) * 100)
    const maxs = ranges.map((range) => (range.max === null ? -1 : range.max * 100))

    const [categories, priceCounts, [{ featured }], [{ recent }], [bounds]] = await Promise.all([
      sql<(CategorySummary & { count: number })[]>`
        select c.id, c.name, c.slug, coalesce(x.count, 0)::int as count
        from categories c
        left join (
          select pc.category_id, count(*)::int as count
          from product_categories pc
          join products p on p.id = pc.product_id
          where ${isVisible(sql)} ${catalogFilters(sql, query, { category: true })}
          group by pc.category_id
        ) x on x.category_id = c.id
        where c.is_active
        order by c.name
      `,
      sql<{ ord: number; count: number }[]>`
        select b.ord::int as ord, count(p.id)::int as count
        from unnest(${mins}::int[], ${maxs}::int[]) with ordinality as b(mn, mx, ord)
        left join products p
          on ${isVisible(sql)}
          and (b.mn < 0 or p.price_cents >= b.mn)
          and (b.mx < 0 or p.price_cents <= b.mx)
          ${catalogFilters(sql, query, { price: true })}
        group by b.ord
        order by b.ord
      `,
      sql<{ featured: number }[]>`
        select count(*)::int as featured from products p
        where ${isVisible(sql)} and p.is_featured ${catalogFilters(sql, query, { featured: true })}
      `,
      sql<{ recent: number }[]>`
        select count(*)::int as recent from products p
        where ${isVisible(sql)} and ${isRecent(sql)} ${catalogFilters(sql, query, { recent: true })}
      `,
      sql<{ min: number | null; max: number | null }[]>`
        select min(p.price_cents)::int as min, max(p.price_cents)::int as max from products p
        where ${isVisible(sql)} ${catalogFilters(sql, query, { price: true })}
      `,
    ])

    return {
      categories: [...categories],
      priceRanges: ranges.map((range, index) => ({ ...range, count: priceCounts[index]?.count ?? 0 })),
      featured,
      recent,
      priceBounds: bounds?.min != null && bounds.max != null ? { min: bounds.min, max: bounds.max } : null,
    }
  })
}

type DetailRow = Omit<CardRow, `image_${string}`> & { description: string }

export async function getProductBySlug(slug: string): Promise<Cached<ProductDetail | null>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("o produto", async (sql) => {
    const [product] = await sql<DetailRow[]>`
      select p.id, p.name, p.slug, p.description, p.price_cents, p.is_available,
             c.id as category_id, c.name as category_name, c.slug as category_slug
      from products p
      ${activeCategory(sql)}
      where p.slug = ${slug} and p.is_active and p.is_available
    `
    if (!product) return null

    const images = (
      await sql<RawImage[]>`
        select id, storage_path, alt_text, position
        from product_images
        where product_id = ${product.id}
        order by position
      `
    ).map(mapImage)

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceCents: product.price_cents,
      isAvailable: product.is_available,
      category: { id: product.category_id, name: product.category_name, slug: product.category_slug },
      image: images[0] ?? null,
      images,
    }
  })
}

/** Outros produtos que compartilham ao menos uma categoria com o produto informado. */
export async function getRelatedProducts(productId: string): Promise<Cached<ProductCardData[]>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("os produtos relacionados", async (sql) => {
    const rows = await publicCards(
      sql,
      sql`and p.id <> ${productId} and exists (
        select 1 from product_categories mine
        join product_categories theirs on theirs.category_id = mine.category_id
        where mine.product_id = ${productId} and theirs.product_id = p.id
      )`,
      sql`order by p.created_at desc limit ${siteConfig.catalog.relatedLimit}`,
    )
    return rows.map(toCard)
  })
}

export async function getSitemapEntries(): Promise<Cached<{ slug: string; updatedAt: Date }[]>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("o sitemap", async (sql) => {
    const rows = await sql<{ slug: string; updatedAt: Date }[]>`
      select p.slug, p.updated_at as "updatedAt"
      from products p
      ${activeCategory(sql)}
      where p.is_active and p.is_available
      limit 5000
    `
    return [...rows]
  })
}

// ---------------------------------------------------------------------------
// Sem cache
// ---------------------------------------------------------------------------

/**
 * Preços e disponibilidade atuais para o carrinho. Sem cache: o pedido do
 * WhatsApp sempre é montado com os dados mais recentes do banco. Lança em caso de falha.
 */
export async function getProductsForCart(ids: string[]): Promise<ProductCardData[]> {
  if (ids.length === 0) return []

  const sql = db()
  const rows = await publicCards(sql, sql`and p.id = any(${ids}::uuid[])`)
  return rows.map(toCard)
}
