import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HiArrowTopRightOnSquare, HiOutlineCube } from "react-icons/hi2"
import { DeleteProductButton } from "@/components/admin/delete-product-button"
import { ImageManager } from "@/components/admin/image-manager"
import { PageHeader } from "@/components/admin/page-header"
import { ProductForm } from "@/components/admin/product-form"
import { StateMessage } from "@/components/shared/state-message"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminPage } from "@/lib/auth/admin"
import { getAdminProduct, getCategoryOptions } from "@/lib/data/admin"
import { uuidSchema } from "@/lib/validation/schemas"

export const metadata: Metadata = { title: "Editar produto" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  await requireAdminPage()

  const { id } = await params
  const { novo } = await searchParams
  if (!uuidSchema.safeParse(id).success) notFound()

  let data: {
    product: Awaited<ReturnType<typeof getAdminProduct>>
    categories: Awaited<ReturnType<typeof getCategoryOptions>>
  } | null
  try {
    const [product, categories] = await Promise.all([getAdminProduct(id), getCategoryOptions()])
    data = { product, categories }
  } catch {
    data = null
  }

  if (data === null) {
    return (
      <StateMessage
        role="alert"
        icon={HiOutlineCube}
        title="Não foi possível carregar o produto"
        description="Verifique a conexão com o banco de dados e tente novamente."
      />
    )
  }

  const { product, categories } = data
  if (!product) notFound()

  const category = categories.find((item) => item.id === product.category_id)
  const isPublic = product.is_active && product.is_available && Boolean(category?.is_active)

  return (
    <>
      <PageHeader
        title={product.name}
        description="Edite os dados, a visibilidade e as imagens do produto."
        back={{ href: "/admin/produtos", label: "Produtos" }}
        actions={
          isPublic ? (
            <Button asChild variant="outline">
              <Link href={`/produtos/${product.slug}`} target="_blank">
                <HiArrowTopRightOnSquare aria-hidden />
                Ver na loja
              </Link>
            </Button>
          ) : null
        }
      />

      {novo ? <ToastOnMount id="produto-criado" variant="success" message="Agora adicione as imagens do produto." /> : null}

      {!isPublic ? (
        <ToastOnMount
          id="produto-oculto"
          variant="info"
          duration={6000}
          message={`Este produto está oculto na loja${
            !product.is_active ? " (inativo)" : !product.is_available ? " (indisponível)" : " (categoria inativa)"
          }.`}
        />
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ProductForm product={product} categories={categories} />
        <div className="space-y-6">
          <ImageManager productId={product.id} productName={product.name} initialImages={product.images} />
          <Card className="rounded-2xl ring-destructive/30">
            <CardHeader>
              <CardTitle>Excluir produto</CardTitle>
              <CardDescription>Esta ação não pode ser desfeita.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteProductButton productId={product.id} productName={product.name} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
