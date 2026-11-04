"use client"

import { useEffect, useRef, useState } from "react"
import { HiCheck, HiOutlineShoppingBag } from "react-icons/hi2"
import { QuantityInput } from "@/components/cart/quantity-input"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics-client"
import { MAX_ITEMS, MAX_QUANTITY, addToCart, type CartItem } from "@/lib/cart/cart"
import { openCartDrawer } from "@/lib/cart/drawer"
import { setCartItems, useCartItems } from "@/lib/cart/store"

export type AddResult = { ok: true } | { ok: false; reason: string }

/**
 * Adiciona um produto ao carrinho respeitando os limites (produtos diferentes e quantidade por produto).
 * Sem toast: quem chama mostra o retorno no próprio botão. Usado na página do produto e no card.
 */
export function addProductToCart(items: CartItem[], product: Omit<CartItem, "quantity">, quantity: number): AddResult {
  const inCart = items.find((item) => item.productId === product.productId)
  if (!inCart && items.length >= MAX_ITEMS) {
    return { ok: false, reason: `O carrinho aceita até ${MAX_ITEMS} produtos diferentes.` }
  }
  if (inCart && inCart.quantity >= MAX_QUANTITY) {
    return { ok: false, reason: `A quantidade máxima por produto é ${MAX_QUANTITY}.` }
  }

  setCartItems((current) => addToCart(current, product, quantity))
  trackEvent("add_to_cart", product.productId, quantity)
  return { ok: true }
}

/** Estado curto de retorno de um botão de adicionar ("adicionado" por um instante). */
export function useJustAdded(durationMs = 1400) {
  const [justAdded, setJustAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const flash = () => {
    setJustAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setJustAdded(false), durationMs)
  }
  return [justAdded, flash] as const
}

export function AddToCart({ product }: { product: Omit<CartItem, "quantity"> }) {
  const items = useCartItems()
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [justAdded, flash] = useJustAdded()
  const inCart = items.find((item) => item.productId === product.productId)

  const handleAdd = () => {
    const result = addProductToCart(items, product, quantity)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setError(null)
    setQuantity(1)
    flash()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <QuantityInput id="product-quantity" label="Quantidade" value={quantity} onChange={setQuantity} />
        <Button className="h-10 min-w-0 flex-1" onClick={handleAdd}>
          {justAdded ? <HiCheck aria-hidden /> : <HiOutlineShoppingBag aria-hidden />}
          {justAdded ? "Adicionado" : "Adicionar ao carrinho"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : inCart ? (
        <p className="text-sm text-muted-foreground" role="status">
          Você já tem {inCart.quantity} {inCart.quantity === 1 ? "unidade" : "unidades"} no carrinho.{" "}
          <button
            type="button"
            onClick={openCartDrawer}
            className="cursor-pointer font-medium text-gold underline-offset-4 hover:underline"
          >
            Ver carrinho
          </button>
        </p>
      ) : null}
    </div>
  )
}
