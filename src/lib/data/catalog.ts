import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { siteConfig } from "@/config/site"
import { db, withScopedDb, type Sql } from "@/lib/db"
import { escapeLike, mapImage, type RawImage } from "@/lib/data/mappers"
import type {
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

/** Produtos visíveis na vitrine, com a categoria e a imagem principal (menor position). */
function publicCards(sql: Sql, where = sql``, orderLimit = sql``) {
  return sql<CardRow[]>`
    select p.id, p.name, p.slug, p.price_cents, p.is_available,
           c.id as category_id, c.name as category_name, c.slug as category_slug,
           i.id as image_id, i.storage_path as image_path, i.alt_text as image_alt, i.position as image_position
    from products p
    join categories c on c.id = p.category_id and c.is_active
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

    const filters = sql`
      ${query.category ? sql`and c.slug = ${query.category}` : sql``}
      ${query.q ? sql`and p.name ilike ${`%${escapeLike(query.q)}%`}` : sql``}
    `

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
        join categories c on c.id = p.category_id and c.is_active
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

type DetailRow = Omit<CardRow, `image_${string}`> & { description: string }

export async function getProductBySlug(slug: string): Promise<Cached<ProductDetail | null>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("o produto", async (sql) => {
    const [product] = await sql<DetailRow[]>`
      select p.id, p.name, p.slug, p.description, p.price_cents, p.is_available,
             c.id as category_id, c.name as category_name, c.slug as category_slug
      from products p
      join categories c on c.id = p.category_id and c.is_active
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

export async function getRelatedProducts(categoryId: string, excludeId: string): Promise<Cached<ProductCardData[]>> {
  "use cache"
  cacheTag(CATALOG_TAG)

  return settle("os produtos relacionados", async (sql) => {
    const rows = await publicCards(
      sql,
      sql`and p.category_id = ${categoryId} and p.id <> ${excludeId}`,
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
      join categories c on c.id = p.category_id and c.is_active
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
