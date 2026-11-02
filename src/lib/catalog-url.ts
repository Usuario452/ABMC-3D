import type { CatalogQuery } from "@/types/catalog"

/** Monta a URL do catálogo com os filtros informados (omitindo valores padrão). */
export function buildCatalogHref(query: Partial<CatalogQuery>) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.category) params.set("categoria", query.category)
  if (query.sort && query.sort !== "nome-asc") params.set("ordem", query.sort)
  if (query.page && query.page > 1) params.set("pagina", String(query.page))
  const search = params.toString()
  return search ? `/catalogo?${search}` : "/catalogo"
}
