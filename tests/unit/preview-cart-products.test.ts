import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ after: vi.fn() }))
vi.mock("@/lib/analytics", () => ({ recordOrder: vi.fn(), recordProductEvent: vi.fn(), recordCatalogEvent: vi.fn() }))
vi.mock("@/lib/data/catalog", () => ({ getProductsForCart: vi.fn() }))

import { after } from "next/server"
import { checkCart, createWhatsAppOrder } from "@/actions/cart"
import { recordProductEvent } from "@/lib/analytics"
import { getProductsForCart } from "@/lib/data/catalog"
import { getPreviewCartProducts, getPreviewProductDetail } from "@/lib/preview-cart-products"
import { POST } from "@/app/api/track/route"

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

function preview() {
  vi.stubEnv("VERCEL_ENV", "preview")
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat/footer-atendimento-01")
  vi.stubEnv("DATABASE_URL", "")
}

describe("produtos fictícios exclusivos do Preview", () => {
  it.each(["production", "development", ""]) ("não expõe exemplos em %s mesmo na branch do PR", (environment) => {
    preview()
    const slug = getPreviewCartProducts()[0].slug
    vi.stubEnv("VERCEL_ENV", environment)
    expect(getPreviewCartProducts()).toEqual([])
    expect(getPreviewProductDetail(slug)).toBeNull()
  })

  it("não expõe exemplos em outra branch de Preview", () => {
    preview()
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main")
    expect(getPreviewCartProducts()).toEqual([])
  })

  it("valida os dois exemplos sem banco, preservando os preços locais e somando quantidades", async () => {
    preview()
    const products = getPreviewCartProducts()
    expect(products).toHaveLength(2)
    expect(products.every((item) => item.imageUrl?.startsWith("/preview-cart/"))).toBe(true)
    const result = await checkCart([
      { productId: products[0].productId, quantity: 2 },
      { productId: products[0].productId, quantity: 1 },
      { productId: products[1].productId, quantity: 1 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.lines.map((item) => item.quantity)).toEqual([3, 1])
    expect(result.data.totalCents).toBe(10960)
    expect(result.data.unavailableIds).toEqual([])
    expect(getProductsForCart).not.toHaveBeenCalled()
  })

  it("não aceita o caminho de exemplos em Production", async () => {
    preview()
    const [product] = getPreviewCartProducts()
    vi.stubEnv("VERCEL_ENV", "production")
    expect((await checkCart([{ productId: product.productId, quantity: 1 }])).ok).toBe(false)
  })

  it("não cria pedidos nem grava eventos dos exemplos", async () => {
    preview()
    const [product] = getPreviewCartProducts()
    const result = await createWhatsAppOrder([{ productId: product.productId, quantity: 1 }])
    expect(result.ok).toBe(false)
    expect(after).not.toHaveBeenCalled()
    const response = await POST(new Request("https://preview.example/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "add_to_cart", productId: product.productId, quantity: 1 }),
    }))
    expect(response.status).toBe(204)
    expect(recordProductEvent).not.toHaveBeenCalled()
    expect(getProductsForCart).not.toHaveBeenCalled()
  })
})
