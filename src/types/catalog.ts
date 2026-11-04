/** Linhas das tabelas, como retornadas pelo banco (db/migrations/0001_init.sql). */
export type CategoryRow = {
  id: string
  name: string
  slug: string
  /** Capa opcional no R2 (categories/<id>/…); null sem capa. */
  cover_path: string | null
  /** Descrição curta opcional (até 300 caracteres); null sem descrição. */
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export type ProductRow = {
  id: string
  name: string
  slug: string
  description: string
  /** Anotação interna (só no painel). */
  internal_notes: string
  price_cents: number
  category_id: string
  is_active: boolean
  is_available: boolean
  is_featured: boolean
  created_at: Date
  updated_at: Date
}

export type ProductImageRow = {
  id: string
  product_id: string
  storage_path: string
  alt_text: string
  position: number
  created_at: Date
}

export type CategorySummary = {
  id: string
  name: string
  slug: string
}

export type ProductImage = {
  id: string
  storagePath: string
  url: string | null
  altText: string
  position: number
}

export type ProductCardData = {
  id: string
  name: string
  slug: string
  priceCents: number
  isAvailable: boolean
  category: CategorySummary | null
  image: ProductImage | null
}

export type ProductDetail = ProductCardData & {
  description: string
  images: ProductImage[]
}

export const CATALOG_SORTS = {
  "nome-asc": "Nome (A–Z)",
  "nome-desc": "Nome (Z–A)",
  "preco-asc": "Menor preço",
  "preco-desc": "Maior preço",
  recentes: "Mais recentes",
} as const

export type CatalogSort = keyof typeof CATALOG_SORTS

export type CatalogQuery = {
  q: string
  category: string
  sort: CatalogSort
  page: number
  /** Faixa de preço em reais inteiros (inclusiva); null = sem limite. */
  minPrice: number | null
  maxPrice: number | null
  /** Só produtos em destaque. */
  featured: boolean
  /** Só produtos publicados nos últimos `siteConfig.catalog.newDays` dias. */
  recent: boolean
}

/** Contagens dos filtros da coluna lateral; cada uma ignora o próprio filtro (como no Mercado Livre). */
export type CatalogFacets = {
  categories: (CategorySummary & { count: number })[]
  priceRanges: { min: number | null; max: number | null; count: number }[]
  featured: number
  recent: number
  /** Menor e maior preço (centavos) entre os produtos dos demais filtros; null sem produtos. */
  priceBounds: { min: number; max: number } | null
}

export type CatalogPage = {
  products: ProductCardData[]
  total: number
  page: number
  pageCount: number
}
