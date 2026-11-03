"use client"

import Link from "next/link"
import { useEffect } from "react"
import { HiArrowPath, HiOutlineExclamationTriangle, HiOutlineHome } from "react-icons/hi2"
import { StatusScreen } from "@/components/shared/status-screen"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      role="alert"
      icon={HiOutlineExclamationTriangle}
      eyebrow="Erro inesperado"
      title="Algo deu errado"
      description="Não foi possível carregar esta página agora. Tente de novo em instantes; se continuar, volte para a página inicial."
      actions={
        <>
          <Button onClick={reset} size="lg">
            <HiArrowPath aria-hidden />
            Tentar novamente
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <HiOutlineHome aria-hidden />
              Página inicial
            </Link>
          </Button>
        </>
      }
      footnote={error.digest ? <>Código de referência: <span className="font-mono">{error.digest}</span></> : null}
    />
  )
}
