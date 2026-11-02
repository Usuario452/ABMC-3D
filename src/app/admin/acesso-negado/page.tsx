import type { Metadata } from "next"
import Link from "next/link"
import { HiOutlineLockClosed } from "react-icons/hi2"
import { signOut } from "@/actions/auth"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Painel indisponível" }

export default function AccessDeniedPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <StateMessage
        className="w-full max-w-lg"
        icon={HiOutlineLockClosed}
        title="Painel indisponível"
        description="Não foi possível verificar sua sessão agora. Confira a conexão com o banco de dados e tente novamente."
        action={
          <>
            <form action={signOut}>
              <Button type="submit">Sair</Button>
            </form>
            <Button asChild variant="outline">
              <Link href="/">Ir para a loja</Link>
            </Button>
          </>
        }
      />
    </main>
  )
}
