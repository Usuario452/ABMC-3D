import type { Metadata } from "next"
import { HiOutlinePlus, HiOutlineTag } from "react-icons/hi2"
import { CategoriesTable } from "@/components/admin/categories-table"
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

  return (
    <>
      <PageHeader title="Categorias" description="Organize os produtos do catálogo." actions={newButton} />
      {categories === null ? (
        <StateMessage
          role="alert"
          icon={HiOutlineTag}
          title="Não foi possível carregar as categorias"
          description="Verifique a conexão com o banco de dados e tente novamente."
        />
      ) : categories.length === 0 ? (
        <StateMessage
          icon={HiOutlineTag}
          title="Nenhuma categoria cadastrada"
          description="Crie a primeira categoria para começar a cadastrar produtos."
          action={newButton}
        />
      ) : (
        <CategoriesTable categories={categories} />
      )}
    </>
  )
}
