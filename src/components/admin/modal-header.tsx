"use client"

import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import { HiXMark } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * Cabeçalho padrão dos modais do painel: ícone dourado à esquerda, título e descrição, ações opcionais
 * e o botão de fechar. Use com `showCloseButton={false}` no DialogContent.
 */
export function ModalHeader({
  icon: Icon,
  title,
  description,
  onClose,
  closeDisabled = false,
  actions,
}: {
  icon: IconType
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  /** Botões extras à esquerda do fechar (ex.: "Ver na loja"). */
  actions?: ReactNode
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-6 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0">
          <DialogTitle className="truncate text-base font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-0.5 text-xs">{description}</DialogDescription> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} disabled={closeDisabled} aria-label="Fechar">
          <HiXMark aria-hidden />
        </Button>
      </div>
    </header>
  )
}
