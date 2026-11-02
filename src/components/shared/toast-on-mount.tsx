"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

type Variant = "info" | "success" | "warning" | "error"

type Props = {
  /** Identificador estável: evita toasts duplicados e permite fechá-lo ao sair da página. */
  id: string
  message: string
  description?: string
  variant?: Variant
  /** Milissegundos na tela; use Infinity para ficar até o usuário fechar. Padrão: o do Toaster. */
  duration?: number
  action?: { label: string; href: string }
}

/**
 * Mostra um toast quando a página é exibida e o fecha ao sair dela. Serve para mensagens que
 * nascem no servidor (avisos de configuração, falhas de carregamento, orientações). Não renderiza nada.
 */
export function ToastOnMount({ id, message, description, variant = "info", duration, action }: Props) {
  const router = useRouter()
  const actionLabel = action?.label
  const actionHref = action?.href

  useEffect(() => {
    // O Toaster fica no layout raiz e assina depois dos filhos: adia um tick para não perder o toast.
    const timer = setTimeout(() => {
      toast[variant](message, {
        id,
        description,
        duration,
        action: actionLabel && actionHref ? { label: actionLabel, onClick: () => router.push(actionHref) } : undefined,
      })
    }, 0)
    return () => {
      clearTimeout(timer)
      toast.dismiss(id)
    }
  }, [id, message, description, variant, duration, actionLabel, actionHref, router])

  return null
}
