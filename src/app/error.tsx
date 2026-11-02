"use client"

import Link from "next/link"
import { useEffect } from "react"
import { HiOutlineExclamationTriangle } from "react-icons/hi2"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <StateMessage
        role="alert"
        className="w-full max-w-lg"
        icon={HiOutlineExclamationTriangle}
        title="Algo deu errado"
        description="Ocorreu um erro inesperado ao carregar esta página. Tente novamente em instantes."
        action={
          <>
            <Button onClick={reset}>Tentar novamente</Button>
            <Button asChild variant="outline">
              <Link href="/">Página inicial</Link>
            </Button>
          </>
        }
      />
    </main>
  )
}
