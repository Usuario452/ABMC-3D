"use client"

import { CartView } from "@/components/cart/cart-view"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cartCount } from "@/lib/cart/cart"
import { closeCartDrawer, setCartDrawerOpen, useCartDrawerOpen } from "@/lib/cart/drawer"
import { useCartItems } from "@/lib/cart/store"

/**
 * Carrinho em gaveta lateral, com o lado esquerdo arredondado. Abre pelo botão do cabeçalho ou ao pedir
 * "Ver carrinho".
 */
export function CartDrawer() {
  const open = useCartDrawerOpen()
  const count = cartCount(useCartItems())

  return (
    <Sheet open={open} onOpenChange={setCartDrawerOpen}>
      <SheetContent
        side="right"
        overlayClassName="supports-backdrop-filter:backdrop-blur-md"
        // Sem foco automático no primeiro botão (a lixeira ficava destacada ao abrir).
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="gap-0 overflow-hidden border-l-0 bg-white p-0 text-zinc-950 shadow-2xl [--foreground:#18181b] [--muted-foreground:#71717a] [--border:#e4e4e7] [--muted:#f4f4f5] data-[side=right]:w-full data-[side=right]:rounded-l-[24px] data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="flex-row items-center gap-2.5 px-5 pt-5 pb-3">
          <SheetTitle className="text-lg font-semibold">Carrinho</SheetTitle>
          {count > 0 ? (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold tabular-nums">
              {count}
            </span>
          ) : null}
          <SheetDescription className="sr-only">
            {count === 0 ? "Nenhum item ainda." : count === 1 ? "1 item" : `${count} itens`}
          </SheetDescription>
        </SheetHeader>
        {/* Só monta com a gaveta aberta: a verificação de preços roda quando a pessoa olha o carrinho. */}
        {open ? <CartView onNavigate={closeCartDrawer} /> : null}
      </SheetContent>
    </Sheet>
  )
}
