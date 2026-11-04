"use client"

import { useState, type ReactNode } from "react"
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/**
 * Botão "Filtros" das telas menores: abre a coluna de filtros numa gaveta à esquerda. Fecha sozinha ao
 * escolher uma opção (clique num link) ou aplicar a faixa de preço.
 */
export function FiltersSheet({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-9 bg-card lg:hidden">
          <HiOutlineAdjustmentsHorizontal aria-hidden />
          Filtros
          {activeCount > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.7rem] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85%] gap-0 overflow-y-auto"
        // Sem foco automático no primeiro campo: no celular ele abriria o teclado por cima da gaveta.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div
          className="p-4"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false)
          }}
          onSubmitCapture={() => setOpen(false)}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
