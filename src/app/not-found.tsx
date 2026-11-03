import Link from "next/link"
import { HiOutlineHome, HiOutlineQuestionMarkCircle, HiOutlineSquares2X2 } from "react-icons/hi2"
import { StatusScreen } from "@/components/shared/status-screen"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <StatusScreen
      icon={HiOutlineQuestionMarkCircle}
      code="404"
      eyebrow="Página não encontrada"
      title="Este endereço não existe"
      description="O link pode estar incorreto ou o produto não está mais disponível."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/catalogo">
              <HiOutlineSquares2X2 aria-hidden />
              Ver catálogo
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <HiOutlineHome aria-hidden />
              Página inicial
            </Link>
          </Button>
        </>
      }
    />
  )
}
