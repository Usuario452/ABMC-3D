import type { Metadata } from "next"
import { HiOutlineCube } from "react-icons/hi2"
import { PageHeader } from "@/components/admin/page-header"
import {
  DEFAULT_PRODUCT_SORT,
  isProductSort,
  isProductStatusFilter,
  type ProductSort,
  type ProductStatusFilter,
} from "@/components/admin/product-status"
import { ProductsManager, type ProductsModal } from "@/components/admin/products-manager"
import { StateMessage } from "@/components/shared/state-message"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { requireAdminPage } from "@/lib/auth/admin"
import { getAdminProduct, getAdminProducts, getCategoryOptions, type AdminProduct } from "@/lib/data/admin"
import { uuidSchema } from "@/lib/validation/schemas"

export const metadata: Metadata = { title: "Produtos" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

/**
 * Entrega a lista completa (até 500 produtos) e as categorias. Busca, filtros, paginação e modais rodam
 * no cliente (ProductsManager); a URL só define o estado inicial, para links e recarregar funcionarem.
 */
export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  await requireAdminPage()

  const params = await searchParams
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : ""
  const rawCategory = typeof params.categoria === "string" ? params.categoria : ""
  const categoria = uuidSchema.safeParse(rawCategory).success ? rawCategory : ""
  const status: ProductStatusFilter = isProductStatusFilter(params.status) ? params.status : "todos"
  const ordem: ProductSort = isProductSort(params.ordem) ? params.ordem : DEFAULT_PRODUCT_SORT
  const requestedPage = typeof params.pagina === "string" ? Number.parseInt(params.pagina, 10) : 1
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const editId = typeof params.editar === "string" && uuidSchema.safeParse(params.editar).success ? params.editar : null

  let data: {
    products: Awaited<ReturnType<typeof getAdminProducts>>
    categories: Awaited<ReturnType<typeof getCategoryOptions>>
    editing: AdminProduct | null
  } | null
  try {
    const [products, categories, editing] = await Promise.all([
      getAdminProducts(),
      getCategoryOptions(),
      editId ? getAdminProduct(editId) : null,
    ])
    data = { products, categories, editing }
  } catch {
    data = null
  }

  const modal: ProductsModal =
    params.novo === "1" ? { mode: "new" } : data?.editing ? { mode: "edit", id: data.editing.id } : null

  return (
    <>
      {data === null ? (
        <>
          <PageHeader title="Produtos" description="Gerencie o catálogo da loja." />
          <StateMessage
            role="alert"
            icon={HiOutlineCube}
            title="Não foi possível carregar os produtos"
            description="Verifique a conexão com o banco de dados e tente novamente."
          />
        </>
      ) : (
        <ProductsManager
          products={data.products}
          categories={data.categories}
          initial={{ q, categoria, status, ordem, page, modal }}
          initialEditing={data.editing}
        />
      )}

      {data && editId && !data.editing ? (
        <ToastOnMount id={`produto-ausente-${editId}`} variant="error" message="Produto não encontrado." />
      ) : null}
    </>
  )
}
