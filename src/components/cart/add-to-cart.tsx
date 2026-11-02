"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { HiOutlineShoppingBag } from "react-icons/hi2"
import { toast } from "sonner"
import { QuantityInput } from "@/components/cart/quantity-input"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics-client"
import { MAX_ITEMS, MAX_QUANTITY, addToCart, type CartItem } from "@/lib/cart/cart"
import { setCartItems, useCartItems } from "@/lib/cart/store"

export function AddToCart({ product }: { product: Omit<CartItem, "quantity"> }) {
  const router = useRouter()
  const items = useCartItems()
  const [quantity, setQuantity] = useState(1)
  const inCart = items.find((item) => item.productId === product.productId)

  const handleAdd = () => {
    if (!inCart && items.length >= MAX_ITEMS) {
      toast.error(`O carrinho aceita até ${MAX_ITEMS} produtos diferentes.`)
      return
    }
    if (inCart && inCart.quantity >= MAX_QUANTITY) {
      toast.error(`A quantidade máxima por produto é ${MAX_QUANTITY}.`)
      return
    }

    setCartItems((current) => addToCart(current, product, quantity))
    trackEvent("add_to_cart", product.productId, quantity)
    toast.success(`${product.name} foi adicionado ao carrinho.`, {
      action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
    })
    setQuantity(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <QuantityInput id="product-quantity" label="Quantidade" value={quantity} onChange={setQuantity} />
        <Button size="lg" className="flex-1" onClick={handleAdd}>
          <HiOutlineShoppingBag aria-hidden />
          Adicionar ao carrinho
        </Button>
      </div>
      {inCart ? (
        <p className="text-sm text-muted-foreground" role="status">
          Você já tem {inCart.quantity} {inCart.quantity === 1 ? "unidade" : "unidades"} no carrinho.{" "}
          <Link href="/carrinho" className="font-medium text-gold underline-offset-4 hover:underline">
            Ver carrinho
          </Link>
        </p>
      ) : null}
    </div>
  )
}
