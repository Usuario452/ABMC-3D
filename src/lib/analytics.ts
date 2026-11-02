import "server-only"

import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { getDatabaseEnv } from "@/lib/env"

/** Eventos da vitrine que o navegador pode registrar (o pedido é registrado pelo servidor). */
export type ClientEventType = "product_view" | "add_to_cart"

/**
 * Registra um evento de produto. Só vale para produto ativo: o valor vem do banco, não do navegador.
 * Falhas são engolidas: a análise nunca deve atrapalhar a loja.
 */
export async function recordProductEvent(type: ClientEventType, productId: string, quantity = 1, sessionId: string | null = null) {
  if (!getDatabaseEnv().ok) return
  try {
    await db()`
      insert into analytics_events (type, product_id, quantity, value_cents, session_id)
      select ${type}, p.id, ${quantity}, p.price_cents * ${type === "add_to_cart" ? quantity : 0}, ${sessionId}
      from products p
      where p.id = ${productId} and p.is_active
    `
  } catch {
    // Sem banco agora: o evento simplesmente não é contado.
  }
}

/** Registra um pedido enviado ao WhatsApp: uma linha por produto, ligadas pelo mesmo order_ref. */
export async function recordOrder(
  lines: { productId: string; quantity: number; unitPriceCents: number }[],
  sessionId: string | null = null,
) {
  if (!getDatabaseEnv().ok || lines.length === 0) return
  const orderRef = randomUUID()
  try {
    const sql = db()
    for (const line of lines) {
      await sql`
        insert into analytics_events (type, product_id, quantity, value_cents, order_ref, session_id)
        select 'checkout_whatsapp', p.id, ${line.quantity}, ${line.unitPriceCents * line.quantity}, ${orderRef}, ${sessionId}
        from products p
        where p.id = ${line.productId}
      `
    }
  } catch {
    // Ver comentário acima.
  }
}

export type VisitInput = {
  visitorId: string
  sessionId: string
  path: string
  isEntry: boolean
  isNewVisitor: boolean
  referrerHost: string | null
  utm: { source: string | null; medium: string | null; campaign: string | null }
  geo: { country: string | null; region: string | null; city: string | null }
  agent: { device: string; browser: string | null; os: string | null }
}

/** Registra uma página vista. Falhas são engolidas: a análise nunca deve atrapalhar a loja. */
export async function recordVisit(visit: VisitInput) {
  if (!getDatabaseEnv().ok) return
  try {
    await db()`
      insert into site_visits (
        visitor_id, session_id, path, is_entry, is_new_visitor, referrer_host,
        utm_source, utm_medium, utm_campaign, country, region, city, device, browser, os
      ) values (
        ${visit.visitorId}, ${visit.sessionId}, ${visit.path}, ${visit.isEntry}, ${visit.isNewVisitor}, ${visit.referrerHost},
        ${visit.utm.source}, ${visit.utm.medium}, ${visit.utm.campaign},
        ${visit.geo.country}, ${visit.geo.region}, ${visit.geo.city},
        ${visit.agent.device}, ${visit.agent.browser}, ${visit.agent.os}
      )
    `
  } catch {
    // Ver comentário acima.
  }
}

export type CatalogEventInput = {
  type: "search" | "category_view"
  visitorId: string | null
  sessionId: string | null
  query: string | null
  categorySlug: string | null
  resultsCount: number | null
}

/** Registra uma busca (com o número de resultados) ou a abertura de uma categoria. */
export async function recordCatalogEvent(event: CatalogEventInput) {
  if (!getDatabaseEnv().ok) return
  try {
    await db()`
      insert into catalog_events (type, visitor_id, session_id, query, category_slug, results_count)
      values (${event.type}, ${event.visitorId}, ${event.sessionId}, ${event.query}, ${event.categorySlug}, ${event.resultsCount})
    `
  } catch {
    // Ver comentário acima.
  }
}
