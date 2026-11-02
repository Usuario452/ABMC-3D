"use client"

import { useEffect, useRef } from "react"
import { trackCategoryView, trackSearch } from "@/lib/analytics-client"
import { getVisitorIds } from "@/lib/visitor-ids"

/**
 * Registra o que a pessoa procurou no catálogo: o texto buscado com o número de resultados (zero = não
 * encontrou) e a categoria aberta. Só a primeira página conta, e a mesma busca não se repete em seguida.
 */
export function TrackCatalog({
  query,
  category,
  results,
  page,
}: {
  query: string | undefined
  category: string | undefined
  results: number
  page: number
}) {
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (page !== 1 || (!query && !category)) return
    const key = `${query ?? ""}|${category ?? ""}`
    if (last.current === key) return
    last.current = key

    const { visitorId, sessionId } = getVisitorIds()
    if (query) trackSearch({ query, category: category ?? null, results, visitorId, sessionId })
    else if (category) trackCategoryView({ category, visitorId, sessionId })
  }, [query, category, results, page])

  return null
}
