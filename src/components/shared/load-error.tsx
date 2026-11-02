import Link from "next/link"
import { HiOutlineExclamationTriangle } from "react-icons/hi2"
import { ConfigToast } from "@/components/shared/config-toast"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import type { LoadResult } from "@/lib/data/load"

/** Exibe o motivo de uma falha de carregamento (configuração ausente ou erro de conexão). */
export function LoadError({ result, retryHref }: { result: Exclude<LoadResult<unknown>, { ok: true }>; retryHref: string }) {
  if (result.kind === "config") {
    return (
      <>
        <ConfigToast issues={result.issues} />
        <StateMessage
          icon={HiOutlineExclamationTriangle}
          title="Catálogo indisponível"
          description="A loja ainda não foi configurada. Tente novamente em instantes."
        />
      </>
    )
  }

  return (
    <StateMessage
      role="alert"
      icon={HiOutlineExclamationTriangle}
      title="Algo deu errado"
      description={result.message}
      action={
        <Button asChild variant="outline">
          <Link href={retryHref} prefetch={false}>
            Tentar novamente
          </Link>
        </Button>
      }
    />
  )
}
