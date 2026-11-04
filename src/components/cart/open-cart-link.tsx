"use client"

import type { ReactNode } from "react"
import { openCartDrawer } from "@/lib/cart/drawer"
import { cn } from "@/lib/utils"

/** Texto clicável que abre a gaveta do carrinho (o carrinho não tem página própria). */
export function OpenCartLink({
  className,
  onClick,
  children,
}: {
  className?: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.()
        openCartDrawer()
      }}
      aria-haspopup="dialog"
      className={cn("cursor-pointer text-left", className)}
    >
      {children}
    </button>
  )
}
