import type { Metadata } from "next"
import { HiOutlinePlus, HiOutlineTag } from "react-icons/hi2"
import { CategoriesView } from "@/components/admin/categories-table"
import { CategoryFormDialog } from "@/components/admin/category-form-dialog"
import { PageHeader } from "@/components/admin/page-header"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { requireAdminPage } from "@/lib/auth/admin"
import { getAdminCategories, type AdminCategory } from "@/lib/data/admin"

export const metadata: Metadata = { title: "Categorias" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

export default async function AdminCategoriesPage() {
  await requireAdminPage()

  let categories: AdminCategory[] | null = null
  try {
    categories = await getAdminCategories()
  } catch {
    categories = null
  }

  const newButton = (
    <CategoryFormDialog
      trigger={
        <Button>
          <HiOutlinePlus aria-hidden />
          Nova categoria
        </Button>
      }
    />
  )
  // No cabeçalho, no celular, só o "+" ao lado da busca.
  const headerButton = (
    <CategoryFormDialog
      trigger={
        <Button className="max-sm:size-9 max-sm:px-0">
          <HiOutlinePlus aria-hidden />
          <span className="sr-only sm:not-sr-only">Nova categoria</span>
        </Button>
      }
    />
  )

  return (
    <>
      {categories === null ? (
        <>
          <PageHeader title="Categorias" description="Organize os produtos do catálogo." />
          <StateMessage
            role="alert"
            icon={HiOutlineTag}
            title="Não foi possível carregar as categorias"
            description="Verifique a conexão com o banco de dados e tente novamente."
          />
        </>
      ) : categories.length === 0 ? (
        <>
          <PageHeader title="Categorias" description="Organize os produtos do catálogo." />
          <StateMessage
            icon={HiOutlineTag}
            title="Nenhuma categoria cadastrada"
            description="Crie a primeira categoria para começar a cadastrar produtos."
            action={newButton}
            className="border-0 bg-card py-14 shadow-panel"
          />
        </>
      ) : (
        <CategoriesView categories={categories} action={headerButton} />
      )}
    </>
  )
}
