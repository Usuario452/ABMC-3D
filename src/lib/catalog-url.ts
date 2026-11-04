import type { CatalogQuery } from "@/types/catalog"

/**
 * Monta a URL de uma listagem com os filtros informados (omitindo valores padrão). Por padrão é o
 * catálogo geral; a página de uma categoria passa o próprio caminho em `basePath`.
 */
export function buildCatalogHref(query: Partial<CatalogQuery>, basePath = "/catalogo") {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.category) params.set("categoria", query.category)
  if (query.sort && query.sort !== "nome-asc") params.set("ordem", query.sort)
  if (query.minPrice != null) params.set("preco-min", String(query.minPrice))
  if (query.maxPrice != null) params.set("preco-max", String(query.maxPrice))
  if (query.featured) params.set("destaques", "1")
  if (query.recent) params.set("novidades", "1")
  if (query.page && query.page > 1) params.set("pagina", String(query.page))
  const search = params.toString()
  return search ? `${basePath}?${search}` : basePath
}

/** Página da categoria (pelo id), com busca/ordem/página opcionais. */
export function buildCategoryHref(id: string, query: Partial<Omit<CatalogQuery, "category">> = {}) {
  return buildCatalogHref({ ...query, category: "" }, `/categorias/${id}`)
}
