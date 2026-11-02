import Link from "next/link"
import { HiOutlineQuestionMarkCircle } from "react-icons/hi2"
import { BrandLogo } from "@/components/brand/brand-logo"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
      <Link href="/" aria-label="Página inicial" className="block w-44">
        <BrandLogo />
      </Link>
      <StateMessage
        className="w-full max-w-lg"
        icon={HiOutlineQuestionMarkCircle}
        title="Página não encontrada"
        description="O endereço acessado não existe ou o produto não está mais disponível."
        action={
          <>
            <Button asChild>
              <Link href="/catalogo">Ver catálogo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Página inicial</Link>
            </Button>
          </>
        }
      />
    </main>
  )
}
