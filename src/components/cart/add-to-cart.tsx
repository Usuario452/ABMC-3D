"use client"

import { useState } from "react"
import { HiOutlineShoppingBag } from "react-icons/hi2"
import { toast } from "sonner"
import { QuantityInput } from "@/components/cart/quantity-input"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics-client"
import { MAX_ITEMS, MAX_QUANTITY, addToCart, type CartItem } from "@/lib/cart/cart"
import { openCartDrawer } from "@/lib/cart/drawer"
import { setCartItems, useCartItems } from "@/lib/cart/store"

/**
 * Adiciona um produto ao carrinho respeitando os limites (produtos diferentes e quantidade por produto),
 * com toast de sucesso ou de erro. Devolve true se adicionou. Usado na página do produto e no card.
 */
export function addProductToCart(items: CartItem[], product: Omit<CartItem, "quantity">, quantity: number) {
  const inCart = items.find((item) => item.productId === product.productId)
  if (!inCart && items.length >= MAX_ITEMS) {
    toast.error(`O carrinho aceita até ${MAX_ITEMS} produtos diferentes.`)
    return false
  }
  if (inCart && inCart.quantity >= MAX_QUANTITY) {
    toast.error(`A quantidade máxima por produto é ${MAX_QUANTITY}.`)
    return false
  }

  setCartItems((current) => addToCart(current, product, quantity))
  trackEvent("add_to_cart", product.productId, quantity)
  toast.success(`${product.name} foi adicionado ao carrinho.`, {
    action: { label: "Ver carrinho", onClick: openCartDrawer },
  })
  return true
}

export function AddToCart({ product }: { product: Omit<CartItem, "quantity"> }) {
  const items = useCartItems()
  const [quantity, setQuantity] = useState(1)
  const inCart = items.find((item) => item.productId === product.productId)

  const handleAdd = () => {
    if (addProductToCart(items, product, quantity)) setQuantity(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <QuantityInput id="product-quantity" label="Quantidade" value={quantity} onChange={setQuantity} />
        <Button className="h-10 min-w-0 flex-1" onClick={handleAdd}>
          <HiOutlineShoppingBag aria-hidden />
          Adicionar ao carrinho
        </Button>
      </div>
      {inCart ? (
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
