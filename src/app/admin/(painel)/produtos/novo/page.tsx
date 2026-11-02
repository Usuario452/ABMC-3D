import type { Metadata } from "next"
import Link from "next/link"
import { HiOutlineTag } from "react-icons/hi2"
import { PageHeader } from "@/components/admin/page-header"
import { ProductForm } from "@/components/admin/product-form"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { requireAdminPage } from "@/lib/auth/admin"
import { getCategoryOptions } from "@/lib/data/admin"

export const metadata: Metadata = { title: "Novo produto" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

export default async function NewProductPage() {
  await requireAdminPage()

  let categories: Awaited<ReturnType<typeof getCategoryOptions>> | null
  try {
    categories = await getCategoryOptions()
  } catch {
    categories = null
  }

  return (
    <>
      <PageHeader
        title="Novo produto"
        description="Depois de criar o produto, você poderá enviar as imagens."
        back={{ href: "/admin/produtos", label: "Produtos" }}
      />
      {categories === null ? (
        <StateMessage role="alert" icon={HiOutlineTag} title="Não foi possível carregar as categorias" />
      ) : categories.length === 0 ? (
        <StateMessage
          icon={HiOutlineTag}
          title="Crie uma categoria primeiro"
          description="Todo produto precisa pertencer a uma categoria."
          action={
            <Button asChild>
              <Link href="/admin/categorias">Gerenciar categorias</Link>
            </Button>
          }
        />
      ) : (
        <div className="max-w-4xl">
          <ProductForm categories={categories} />
        </div>
      )}
    </>
  )
}
