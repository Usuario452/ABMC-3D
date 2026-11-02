import { z } from "zod"
import { siteConfig } from "@/config/site"

/** Item do carrinho salvo no navegador. Preço e nome são apenas uma prévia: o servidor revalida tudo. */
export type CartItem = {
  productId: string
  slug: string
  name: string
  unitPriceCents: number
  imageUrl: string | null
  quantity: number
}

export const MAX_QUANTITY = siteConfig.cart.maxQuantityPerItem
export const MAX_ITEMS = siteConfig.cart.maxItems

const storedItemSchema = z.object({
  productId: z.uuid(),
  slug: z.string().min(1).max(140),
  name: z.string().min(1).max(200),
  unitPriceCents: z.number().int().min(0),
  imageUrl: z.string().max(2000).nullable(),
  quantity: z.number(),
})

export function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(value)))
}

export function addToCart(items: CartItem[], item: Omit<CartItem, "quantity">, quantity: number): CartItem[] {
  const existing = items.find((current) => current.productId === item.productId)
  if (existing) {
    return items.map((current) =>
      current.productId === item.productId
        ? { ...current, ...item, quantity: clampQuantity(current.quantity + clampQuantity(quantity)) }
        : current,
    )
  }
  if (items.length >= MAX_ITEMS) return items
  return [...items, { ...item, quantity: clampQuantity(quantity) }]
}

export function updateQuantity(items: CartItem[], productId: string, quantity: number): CartItem[] {
  return items.map((item) => (item.productId === productId ? { ...item, quantity: clampQuantity(quantity) } : item))
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId)
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
}

/** Lê o carrinho salvo, descartando itens corrompidos ou duplicados. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const seen = new Set<string>()
  const items: CartItem[] = []
  for (const entry of data) {
    const parsed = storedItemSchema.safeParse(entry)
    if (!parsed.success || seen.has(parsed.data.productId)) continue
    seen.add(parsed.data.productId)
    items.push({ ...parsed.data, quantity: clampQuantity(parsed.data.quantity) })
    if (items.length >= MAX_ITEMS) break
  }
  return items
}

export type CartSnapshotLine = {
  productId: string
  slug: string
  name: string
  unitPriceCents: number
  imageUrl: string | null
}

/** Atualiza nome, preço e imagem dos itens com os dados atuais do servidor. */
export function applySnapshot(items: CartItem[], lines: CartSnapshotLine[]): CartItem[] {
  const byId = new Map(lines.map((line) => [line.productId, line]))
  return items.map((item) => {
    const line = byId.get(item.productId)
    return line ? { ...item, ...line } : item
  })
}

export function toCartRequest(items: CartItem[]) {
  return items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
}
