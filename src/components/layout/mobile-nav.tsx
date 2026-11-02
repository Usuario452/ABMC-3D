"use client"

import Link from "next/link"
import { useState } from "react"
import { HiBars3 } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { CategorySummary } from "@/types/catalog"

export function MobileNav({ categories }: { categories: CategorySummary[] }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <HiBars3 className="size-6" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal da loja</SheetDescription>
        </SheetHeader>
        <nav aria-label="Menu principal" className="flex flex-col gap-1 px-4 pb-6">
          <MobileLink href="/" onNavigate={close}>
            Início
          </MobileLink>
          <MobileLink href="/catalogo" onNavigate={close}>
            Catálogo completo
          </MobileLink>
          <MobileLink href="/carrinho" onNavigate={close}>
            Carrinho
          </MobileLink>
          {categories.length > 0 ? (
            <>
              <Separator className="my-3" />
              <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Categorias
              </p>
              {categories.map((category) => (
                <MobileLink key={category.id} href={`/catalogo?categoria=${category.slug}`} onNavigate={close}>
                  {category.name}
                </MobileLink>
              ))}
            </>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}
