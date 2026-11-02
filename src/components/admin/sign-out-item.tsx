"use client"

import { useTransition } from "react"
import { HiArrowPath, HiOutlineArrowRightOnRectangle } from "react-icons/hi2"
import { signOut } from "@/actions/auth"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

/** "Sair do painel" no menu do usuário: responde ao clique na hora e mantém o menu aberto até a saída. */
export function SignOutItem() {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={(event) => {
        // O menu fica aberto mostrando "Saindo…"; a action redireciona para o login ao terminar.
        event.preventDefault()
        startTransition(async () => {
          await signOut()
        })
      }}
      className="cursor-pointer"
    >
      {isPending ? (
        <HiArrowPath className="size-4 animate-spin" aria-hidden />
      ) : (
        <HiOutlineArrowRightOnRectangle className="size-4" aria-hidden />
      )}
      {isPending ? "Saindo…" : "Sair do painel"}
    </DropdownMenuItem>
  )
}
