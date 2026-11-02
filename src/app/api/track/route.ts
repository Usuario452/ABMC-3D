import { z } from "zod"
import { recordCatalogEvent, recordProductEvent } from "@/lib/analytics"
import { parseUserAgent } from "@/lib/user-agent"

const optionalId = z.uuid().nullish().transform((value) => value ?? null)

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["product_view", "add_to_cart"]),
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(99).optional(),
    sessionId: optionalId,
  }),
  z.object({
    type: z.literal("search"),
    query: z.string().trim().min(1).max(100),
    category: z.string().trim().max(100).nullish(),
    results: z.number().int().min(0).max(100000),
    visitorId: optionalId,
    sessionId: optionalId,
  }),
  z.object({
    type: z.literal("category_view"),
    category: z.string().trim().min(1).max(100),
    visitorId: optionalId,
    sessionId: optionalId,
  }),
])

/** Recebe eventos anônimos da vitrine: produto visto, item no carrinho, busca e categoria aberta. */
export async function POST(request: Request) {
  // Exigir JSON impede o envio por formulários de outros sites.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(null, { status: 415 })
  }
  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })
  if (parseUserAgent(request.headers.get("user-agent")).bot) return new Response(null, { status: 204 })

  const event = parsed.data
  if (event.type === "search") {
    await recordCatalogEvent({
      type: "search",
      visitorId: event.visitorId,
      sessionId: event.sessionId,
      // Normalizado: minúsculas e espaços únicos, para somar a mesma busca escrita de jeitos diferentes.
      query: event.query.toLowerCase().replace(/\s+/g, " "),
      categorySlug: event.category || null,
      resultsCount: event.results,
    })
  } else if (event.type === "category_view") {
    await recordCatalogEvent({
      type: "category_view",
      visitorId: event.visitorId,
      sessionId: event.sessionId,
      query: null,
      categorySlug: event.category,
      resultsCount: null,
    })
  } else {
    await recordProductEvent(event.type, event.productId, event.quantity, event.sessionId)
  }
  return new Response(null, { status: 204 })
}
