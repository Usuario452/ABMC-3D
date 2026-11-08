import "server-only"

import type { CartItem } from "@/lib/cart/cart"
import type { ProductDetail } from "@/types/catalog"

const products: Omit<CartItem, "quantity">[] = [
  {
    productId: "f5a25c01-8df0-4f26-8fc0-000000000001",
    slug: "preview-vaso-geometrico",
    name: "Vaso geométrico — teste",
    unitPriceCents: 2990,
    imageUrl: "/preview-cart/vaso.svg",
  },
  {
    productId: "f5a25c01-8df0-4f26-8fc0-000000000002",
    slug: "preview-suporte-celular",
    name: "Suporte para celular — teste",
    unitPriceCents: 1990,
    imageUrl: "/preview-cart/suporte.svg",
  },
]

/** Fail closed: exemplos disponíveis somente no Preview da branch do PR #5. */
export function getPreviewCartProducts() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feat/footer-atendimento-01"
    ? products
    : []
}

export function isPreviewCartProduct(productId: string) {
  return getPreviewCartProducts().some((product) => product.productId === productId)
}

export function getPreviewProductDetail(slug: string): ProductDetail | null {
  const product = getPreviewCartProducts().find((item) => item.slug === slug)
  if (!product) return null
  const image = {
    id: product.productId,
    storagePath: product.imageUrl!.slice(1),
    url: product.imageUrl,
    altText: product.name,
    position: 0,
  }
  return {
    id: product.productId,
    name: product.name,
    slug: product.slug,
    priceCents: product.unitPriceCents,
    compareAtPriceCents: null,
    isAvailable: true,
    category: null,
    image,
    images: [image],
    description: "Produto fictício exclusivo do Preview para testar o carrinho. Não está à venda e não gera pedidos.",
  }
}

/** Valida somente carrinhos de exemplos; preços e nomes vêm destes dados locais. */
export function getPreviewCartCheck(items: { productId: string; quantity: number }[]) {
  const available = getPreviewCartProducts()
  if (!items.length || !available.length || !items.every((item) => isPreviewCartProduct(item.productId))) return null

  const quantities = new Map<string, number>()
  for (const item of items) {
    quantities.set(item.productId, Math.min(99, (quantities.get(item.productId) ?? 0) + item.quantity))
  }
  const lines = available.flatMap((product) => {
    const quantity = quantities.get(product.productId)
    return quantity ? [{ ...product, quantity }] : []
  })
  return {
    lines,
    unavailableIds: [] as string[],
    totalCents: lines.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0),
  }
}
