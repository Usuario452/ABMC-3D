import type { CatalogQuery } from "@/types/catalog"

const reais = (value: number) => `R$ ${value.toLocaleString("pt-BR")}`

/** Rótulo de uma faixa de preço em reais: "Até R$ 30", "R$ 30 a R$ 60", "Mais de R$ 100". */
export function priceRangeLabel(min: number | null, max: number | null) {
  if (min !== null && max !== null) return min === max ? reais(min) : `${reais(min)} a ${reais(max)}`
  if (max !== null) return `Até ${reais(max)}`
  if (min !== null) return `A partir de ${reais(min)}`
  return "Qualquer preço"
}

/** Quantos filtros estão aplicados (busca, categoria, preço, destaques e novidades). A ordenação não conta. */
export function countActiveFilters(query: CatalogQuery) {
  return [
    query.q,
    query.category,
    query.minPrice !== null || query.maxPrice !== null,
    query.featured,
    query.recent,
  ].filter(Boolean).length
}
