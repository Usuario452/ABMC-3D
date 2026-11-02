import { describe, expect, it } from "vitest"
import {
  MAX_ITEMS,
  MAX_QUANTITY,
  addToCart,
  applySnapshot,
  cartCount,
  cartSubtotal,
  clampQuantity,
  parseStoredCart,
  removeFromCart,
  updateQuantity,
  type CartItem,
} from "@/lib/cart/cart"
import { cartRequestSchema } from "@/lib/validation/schemas"

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"

const product = (id: string, price = 1000) => ({
  productId: id,
  slug: `produto-${id.slice(0, 4)}`,
  name: `Produto ${id.slice(0, 4)}`,
  unitPriceCents: price,
  imageUrl: null,
})

describe("quantidades", () => {
  it("limita entre 1 e o máximo", () => {
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(-5)).toBe(1)
    expect(clampQuantity(2.7)).toBe(2)
    expect(clampQuantity(Number.NaN)).toBe(1)
    expect(clampQuantity(1000)).toBe(MAX_QUANTITY)
  })
})

describe("operações do carrinho", () => {
  it("adiciona, soma quantidades do mesmo produto e respeita o limite", () => {
    let items: CartItem[] = []
    items = addToCart(items, product(A), 2)
    items = addToCart(items, product(A), 3)
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(5)

    items = addToCart(items, product(A), 500)
    expect(items[0].quantity).toBe(MAX_QUANTITY)
  })

  it("altera quantidade, remove e calcula totais", () => {
    let items = addToCart(addToCart([], product(A, 1990), 1), product(B, 500), 3)
    items = updateQuantity(items, A, 2)
    expect(cartCount(items)).toBe(5)
    expect(cartSubtotal(items)).toBe(1990 * 2 + 500 * 3)

    items = updateQuantity(items, B, 0)
    expect(items.find((item) => item.productId === B)?.quantity).toBe(1)

    items = removeFromCart(items, A)
    expect(items.map((item) => item.productId)).toEqual([B])
  })

  it("não ultrapassa o número máximo de produtos diferentes", () => {
    let items: CartItem[] = []
    for (let i = 0; i < MAX_ITEMS + 5; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
      items = addToCart(items, product(id), 1)
    }
    expect(items).toHaveLength(MAX_ITEMS)
  })

  it("atualiza preços com os dados do servidor", () => {
    const items = addToCart([], product(A, 1000), 2)
    const updated = applySnapshot(items, [{ ...product(A, 1500), name: "Novo nome" }])
    expect(updated[0]).toMatchObject({ unitPriceCents: 1500, name: "Novo nome", quantity: 2 })
  })
})

describe("persistência (localStorage)", () => {
  it("restaura itens válidos e descarta corrompidos ou duplicados", () => {
    const raw = JSON.stringify([
      { ...product(A), quantity: 3 },
      { ...product(A), quantity: 9 },
      { ...product(B), quantity: 500 },
      { productId: "não-é-uuid", slug: "x", name: "x", unitPriceCents: 1, imageUrl: null, quantity: 1 },
      { ...product(B), unitPriceCents: -1, quantity: 1 },
      "lixo",
    ])
    const items = parseStoredCart(raw)
    expect(items.map((item) => [item.productId, item.quantity])).toEqual([
      [A, 3],
      [B, MAX_QUANTITY],
    ])
  })

  it("retorna vazio para JSON inválido", () => {
    expect(parseStoredCart("{not json")).toEqual([])
    expect(parseStoredCart(null)).toEqual([])
    expect(parseStoredCart('{"a":1}')).toEqual([])
  })
})

describe("validação do pedido no servidor", () => {
  it("aceita somente ids UUID e quantidades inteiras válidas", () => {
    expect(cartRequestSchema.safeParse([{ productId: A, quantity: 2 }]).success).toBe(true)
    expect(cartRequestSchema.safeParse([{ productId: A, quantity: 0 }]).success).toBe(false)
    expect(cartRequestSchema.safeParse([{ productId: A, quantity: 1.5 }]).success).toBe(false)
    expect(cartRequestSchema.safeParse([{ productId: A, quantity: 100 }]).success).toBe(false)
    expect(cartRequestSchema.safeParse([{ productId: "1", quantity: 1 }]).success).toBe(false)
    // Preço enviado pelo cliente é ignorado (não faz parte do contrato).
    const parsed = cartRequestSchema.parse([{ productId: A, quantity: 1, unitPriceCents: 1 }])
    expect(parsed[0]).toEqual({ productId: A, quantity: 1 })
  })
})
