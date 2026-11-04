"use server"

import { after } from "next/server"
import { recordOrder } from "@/lib/analytics"
import { failure, success, type ActionResult } from "@/lib/actions/result"
import type { CartSnapshotLine } from "@/lib/cart/cart"
import { getProductsForCart } from "@/lib/data/catalog"
import { getDatabaseEnv } from "@/lib/env"
import { cartRequestSchema, uuidSchema } from "@/lib/validation/schemas"
import { buildOrderMessage, buildWhatsAppUrl, getWhatsAppConfig, orderTotal } from "@/lib/whatsapp"

export type CartCheck = {
  lines: (CartSnapshotLine & { quantity: number })[]
  unavailableIds: string[]
  totalCents: number
}

async function checkItems(input: unknown): Promise<ActionResult<CartCheck>> {
  const parsed = cartRequestSchema.safeParse(input)
  if (!parsed.success) return failure("O carrinho contém itens inválidos.")

  if (!getDatabaseEnv().ok) {
    return failure("A loja ainda não foi configurada. Tente novamente mais tarde.", { code: "config" })
  }

  // Mescla itens repetidos e busca os dados atuais no banco (sem confiar no navegador).
  const quantities = new Map<string, number>()
  for (const item of parsed.data) {
    quantities.set(item.productId, Math.min(99, (quantities.get(item.productId) ?? 0) + item.quantity))
  }

  let products
  try {
    products = await getProductsForCart([...quantities.keys()])
  } catch {
    return failure("Não foi possível consultar os produtos agora. Verifique sua conexão e tente novamente.")
  }

  const byId = new Map(products.map((product) => [product.id, product]))
  const lines: CartCheck["lines"] = []
  const unavailableIds: string[] = []

  for (const [productId, quantity] of quantities) {
    const product = byId.get(productId)
    if (!product) {
      // Removido, inativo, indisponível ou de categoria inativa.
      unavailableIds.push(productId)
      continue
    }
    lines.push({
      productId,
      slug: product.slug,
      name: product.name,
      unitPriceCents: product.priceCents,
      imageUrl: product.image?.url ?? null,
      quantity,
    })
  }

  return success({ lines, unavailableIds, totalCents: orderTotal(lines) })
}

/** Revalida o carrinho com preços e disponibilidade atuais. */
export async function checkCart(input: unknown): Promise<ActionResult<CartCheck>> {
  return checkItems(input)
}

/** Monta o pedido com os dados do servidor e devolve o link do WhatsApp. */
export async function createWhatsAppOrder(
  input: unknown,
  /** Sessão do navegador, só para ligar o pedido ao carrinho e à origem da visita no painel. */
  sessionId?: unknown,
): Promise<ActionResult<{ url: string; check: CartCheck }>> {
  const whatsapp = getWhatsAppConfig()
  if (!whatsapp.ok) {
    return failure(
      whatsapp.reason === "ausente"
        ? "O número de WhatsApp da loja ainda não foi configurado."
        : "O número de WhatsApp configurado é inválido.",
      { code: "config" },
    )
  }

  const result = await checkItems(input)
  if (!result.ok) return result

  const check = result.data
  // Itens indisponíveis não bloqueiam o pedido: ficam marcados no carrinho e não entram na mensagem.
  if (check.lines.length === 0) return failure("Nenhum item do carrinho está disponível no momento.")

  // Conversão: o pedido é contado no servidor, com os preços do banco, depois da resposta.
  const session = uuidSchema.safeParse(sessionId)
  after(() => recordOrder(check.lines, session.success ? session.data : null))

  const message = buildOrderMessage(check.lines)
  return success({ url: buildWhatsAppUrl(whatsapp.number, message), check })
}
