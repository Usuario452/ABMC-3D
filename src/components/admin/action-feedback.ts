"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { toast } from "sonner"
import type { ActionFailure, ActionResult } from "@/lib/actions/result"

/**
 * Exibe o resultado de uma Server Action administrativa e trata sessão expirada
 * redirecionando para o login. Retorna true em caso de sucesso.
 */
export function useActionFeedback() {
  const router = useRouter()

  return useCallback(
    <T,>(result: ActionResult<T>, fallbackSuccess?: string): result is Exclude<ActionResult<T>, ActionFailure> => {
      if (result.ok) {
        const message = result.message ?? fallbackSuccess
        if (message) toast.success(message)
        return true
      }
      toast.error(result.error)
      if (result.code === "unauthenticated") {
        router.push("/admin/login?motivo=sessao-expirada")
      }
      return false
    },
    [router],
  )
}

export function networkErrorToast() {
  toast.error("Falha de comunicação com o servidor. Verifique sua conexão e tente novamente.")
}
