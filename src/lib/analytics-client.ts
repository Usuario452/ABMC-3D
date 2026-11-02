import { getVisitorIds } from "@/lib/visitor-ids"

/** Envia um evento anônimo da vitrine. Nunca lança erro: a análise não pode atrapalhar a loja. */
function send(url: string, payload: unknown) {
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Sem rede ou bloqueado pelo navegador: o evento não é contado.
  }
}

export function trackEvent(type: "product_view" | "add_to_cart", productId: string, quantity?: number) {
  send("/api/track", { type, productId, quantity, sessionId: getVisitorIds().sessionId })
}

type Ids = { visitorId: string | null; sessionId: string | null }

export function trackSearch(payload: { query: string; category: string | null; results: number } & Ids) {
  send("/api/track", { type: "search", ...payload })
}

export function trackCategoryView(payload: { category: string } & Ids) {
  send("/api/track", { type: "category_view", ...payload })
}

export function trackVisit(payload: {
  visitorId: string
  sessionId: string
  path: string
  isEntry: boolean
  isNewVisitor: boolean
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}) {
  send("/api/visit", payload)
}
