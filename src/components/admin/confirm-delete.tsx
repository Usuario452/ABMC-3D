"use client"

import { useState, useTransition, type ReactNode } from "react"
import type { IconType } from "react-icons"
import { HiOutlineExclamationTriangle, HiOutlineTrash } from "react-icons/hi2"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ConfirmProps = {
  /** Elemento que abre o diálogo. Sem ele, controle a abertura com `open`/`onOpenChange`. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  /** Texto do botão enquanto confirma. */
  pendingLabel: string
  icon: IconType
  /** "danger": vermelho (excluir); "warning": dourado (ações reversíveis, como desativar). */
  tone: "danger" | "warning"
  /** Mostra o diálogo apenas como aviso, sem permitir a confirmação. */
  confirmDisabled?: boolean
  /** Deve retornar true se concluiu (o diálogo fecha); false mantém aberto. */
  onConfirm: () => Promise<boolean>
}

/**
 * Diálogo de confirmação, o mesmo em todo o painel: ícone antes do título, descrição curta e botão
 * sólido de confirmar. Fecha ao clicar fora, no X ou com Esc, exceto enquanto confirma.
 */
export function ConfirmAction({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  icon,
  tone,
  confirmDisabled = false,
  onConfirm,
}: ConfirmProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const [isPending, startTransition] = useTransition()
  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }
  const Icon = confirmDisabled ? HiOutlineExclamationTriangle : icon
  const warning = confirmDisabled || tone === "warning"

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent role="alertdialog" showCloseButton={!isPending} className="gap-0 p-5 sm:max-w-[400px]">
        {/* Ícone e título na mesma linha; o texto vem abaixo, na largura toda. */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              warning ? "bg-gold/10 text-gold" : "bg-destructive/10 text-destructive",
            )}
            aria-hidden
          >
            <Icon className="size-5" />
          </span>
          <DialogTitle className="min-w-0 pr-6 text-[15px] leading-snug font-semibold text-balance">{title}</DialogTitle>
        </div>
        <DialogDescription className="mt-3 text-[13px] leading-relaxed text-pretty">{description}</DialogDescription>

        <div className="mt-5 flex gap-2 *:flex-1 sm:justify-end sm:*:flex-none">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isPending}>
              {confirmDisabled ? "Entendi" : "Cancelar"}
            </Button>
          </DialogClose>
          {confirmDisabled ? null : (
            <Button
              type="button"
              variant={tone === "danger" ? "danger" : "default"}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const done = await onConfirm()
                  if (done) setOpen(false)
                })
              }
            >
              {isPending ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />
              ) : (
                <Icon aria-hidden />
              )}
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Confirmação de exclusão: ícone de lixeira e botão vermelho. */
export function ConfirmDelete({
  confirmLabel = "Excluir",
  pendingLabel = "Excluindo…",
  ...props
}: Omit<ConfirmProps, "icon" | "tone" | "confirmLabel" | "pendingLabel"> & { confirmLabel?: string; pendingLabel?: string }) {
  return <ConfirmAction {...props} icon={HiOutlineTrash} tone="danger" confirmLabel={confirmLabel} pendingLabel={pendingLabel} />
}
