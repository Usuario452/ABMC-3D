"use client"

import { HiOutlineShoppingBag } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { cartCount } from "@/lib/cart/cart"
import { openCartDrawer } from "@/lib/cart/drawer"
import { useCartItems } from "@/lib/cart/store"

export function CartButton() {
  const items = useCartItems()
  const count = cartCount(items)
  const label = count === 0 ? "Carrinho vazio" : `Carrinho com ${count} ${count === 1 ? "item" : "itens"}`

  return (
    // Herda a cor do cabeçalho (branco no hero, cor do tema na barra); fundo só ao passar o mouse.
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative size-10 rounded-full text-inherit hover:bg-current/10 hover:text-inherit dark:hover:bg-current/10"
    >
      <button type="button" onClick={openCartDrawer} aria-label={label} aria-haspopup="dialog">
        <HiOutlineShoppingBag className="size-[22px]" aria-hidden />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.7rem] leading-5 font-bold text-primary-foreground"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
    </Button>
  )
}
