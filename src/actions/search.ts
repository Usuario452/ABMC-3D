"use server"

import { getCatalogPage } from "@/lib/data/catalog"
import { parseCatalogQuery } from "@/lib/validation/schemas"
import type { ProductCardData } from "@/types/catalog"

export type HomeSearchResult = { ok: true; products: ProductCardData[]; total: number } | { ok: false }

/** Busca da home: mesma regra do catálogo (nome contém o texto), primeira página, ordem alfabética. */
export async function searchProducts(text: string): Promise<HomeSearchResult> {
  const query = parseCatalogQuery({ q: String(text ?? "") })
  if (!query.q) return { ok: true, products: [], total: 0 }

  const result = await getCatalogPage(query)
  if (!result.ok) return { ok: false }
  return { ok: true, products: result.data.products, total: result.data.total }
}

export type ProductsPageResult = { ok: true; products: ProductCardData[]; page: number; pageCount: number } | { ok: false }

/** Página seguinte da lista "Todos os produtos" da home (mais recentes primeiro), para a rolagem infinita. */
export async function loadProductsPage(page: number): Promise<ProductsPageResult> {
  const query = parseCatalogQuery({ sort: "recentes", page: String(Number(page) || 1) })
  const result = await getCatalogPage(query)
  if (!result.ok) return { ok: false }
  return { ok: true, products: result.data.products, page: result.data.page, pageCount: result.data.pageCount }
}
