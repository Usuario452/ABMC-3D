"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/** Diálogo de confirmação para ações destrutivas. onConfirm deve retornar true se concluiu. */
export function ConfirmDelete({
  trigger,
  title,
  description,
  confirmLabel = "Excluir",
  confirmDisabled = false,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel?: string
  /** Mostra o diálogo apenas como aviso, sem permitir a confirmação. */
  confirmDisabled?: boolean
  onConfirm: () => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{confirmDisabled ? "Entendi" : "Cancelar"}</AlertDialogCancel>
          {confirmDisabled ? null : (
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const done = await onConfirm()
                if (done) setOpen(false)
              })
            }
          >
            {isPending ? "Excluindo…" : confirmLabel}
          </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
