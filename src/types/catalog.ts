/** Linhas das tabelas, como retornadas pelo banco (db/migrations/0001_init.sql). */
export type CategoryRow = {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export type ProductRow = {
  id: string
  name: string
  slug: string
  description: string
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
}

export type CatalogPage = {
  products: ProductCardData[]
  total: number
  page: number
  pageCount: number
}
