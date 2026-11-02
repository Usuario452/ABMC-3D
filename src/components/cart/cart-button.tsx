"use client"

import Link from "next/link"
import { HiOutlineShoppingBag } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { cartCount } from "@/lib/cart/cart"
import { useCartItems } from "@/lib/cart/store"

export function CartButton() {
  const items = useCartItems()
  const count = cartCount(items)
  const label = count === 0 ? "Carrinho vazio" : `Carrinho com ${count} ${count === 1 ? "item" : "itens"}`

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/carrinho" aria-label={label}>
        <HiOutlineShoppingBag className="size-6" aria-hidden />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.7rem] leading-5 font-bold text-primary-foreground"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
