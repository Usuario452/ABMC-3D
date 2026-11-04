"use client"

import { useState } from "react"
import { HiCheck, HiOutlineShoppingBag } from "react-icons/hi2"
import { addProductToCart, useJustAdded } from "@/components/cart/add-to-cart"
import { Button } from "@/components/ui/button"
import type { CartItem } from "@/lib/cart/cart"
import { useCartItems } from "@/lib/cart/store"
import { cn } from "@/lib/utils"

/**
 * Botão pequeno e primário de "adicionar ao carrinho" do card de produto (1 unidade por clique). Já no
 * carrinho, ganha um badge com a quantidade. Sem toast: ao adicionar, mostra um check por um instante; no
 * limite, o motivo aparece no próprio botão (title e leitor de tela). Fica acima do link do card (z-10),
 * então o clique não abre o produto.
 */
export function QuickAdd({ product, className }: { product: Omit<CartItem, "quantity">; className?: string }) {
  const items = useCartItems()
  const quantity = items.find((item) => item.productId === product.productId)?.quantity ?? 0
  const [justAdded, flash] = useJustAdded()
  const [blocked, setBlocked] = useState<string | null>(null)

  return (
    <Button
      type="button"
      size="sm"
      aria-label={
        quantity > 0
          ? `Adicionar mais um ${product.name} (${quantity} no carrinho)`
          : `Adicionar ${product.name} ao carrinho`
      }
      aria-describedby={undefined}
      title={blocked ?? undefined}
      onClick={() => {
        const result = addProductToCart(items, product, 1)
        if (result.ok) {
          setBlocked(null)
          flash()
        } else {
          setBlocked(result.reason)
        }
      }}
      className={cn("relative z-10 h-8 gap-1 px-2.5 sm:gap-1.5 sm:px-3", className)}
    >
      {justAdded ? <HiCheck className="size-4" aria-hidden /> : <HiOutlineShoppingBag className="size-4" aria-hidden />}
      <span>{blocked ? "Limite" : justAdded ? "Adicionado" : "Add"}</span>
      {blocked ? <span className="sr-only" role="alert">{blocked}</span> : null}
      {quantity > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-foreground px-1 text-[0.625rem] leading-4.5 font-semibold text-background">
          {quantity}
        </span>
      ) : null}
    </Button>
  )
}
