import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"
import { HiMagnifyingGlass, HiOutlineCube, HiOutlinePlus } from "react-icons/hi2"
import { PageHeader } from "@/components/admin/page-header"
import { ProductsTable } from "@/components/admin/products-table"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requireAdminPage } from "@/lib/auth/admin"
import { getAdminProducts, getCategoryOptions } from "@/lib/data/admin"
import { uuidSchema } from "@/lib/validation/schemas"

export const metadata: Metadata = { title: "Produtos" }

// Página do painel: lê o banco depois de validar a sessão, então bloqueia a navegação.
export const instant = false

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  await requireAdminPage()

  const params = await searchParams
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : ""
  const rawCategory = typeof params.categoria === "string" ? params.categoria : ""
  const categoryId = uuidSchema.safeParse(rawCategory).success ? rawCategory : ""

  let data: { products: Awaited<ReturnType<typeof getAdminProducts>>; categories: Awaited<ReturnType<typeof getCategoryOptions>> } | null
  try {
    const [products, categories] = await Promise.all([getAdminProducts({ q, categoryId }), getCategoryOptions()])
    data = { products, categories }
  } catch {
    data = null
  }

  const newButton = (
    <Button asChild>
      <Link href="/admin/produtos/novo">
        <HiOutlinePlus aria-hidden />
        Novo produto
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader title="Produtos" description="Gerencie o catálogo da loja." actions={newButton} />

      {data === null ? (
        <StateMessage
          role="alert"
          icon={HiOutlineCube}
          title="Não foi possível carregar os produtos"
          description="Verifique a conexão com o banco de dados e tente novamente."
        />
      ) : (
        <div className="space-y-6">
          <Form
            action="/admin/produtos"
            className="grid gap-3 rounded-2xl bg-card p-3 shadow-panel sm:grid-cols-[1fr_260px_auto]"
            role="search"
          >
            <div className="relative">
              <Label htmlFor="admin-search" className="sr-only">
                Buscar por nome
              </Label>
              <HiMagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input id="admin-search" name="q" type="search" defaultValue={q} placeholder="Buscar por nome" className="h-11 bg-background pl-10" />
            </div>
            <div>
              <Label htmlFor="admin-category" className="sr-only">
                Filtrar por categoria
              </Label>
              <select
                id="admin-category"
                name="categoria"
                defaultValue={categoryId}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Todas as categorias</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="lg">
              Filtrar
            </Button>
          </Form>

          {data.products.length === 0 ? (
            q || categoryId ? (
              <StateMessage
                icon={HiMagnifyingGlass}
                title="Nenhum produto encontrado"
                description="Ajuste a busca ou o filtro de categoria."
                action={
                  <Button asChild variant="outline">
                    <Link href="/admin/produtos">Limpar filtros</Link>
                  </Button>
                }
              />
            ) : (
              <StateMessage
                icon={HiOutlineCube}
                title="Nenhum produto cadastrado"
                description={
                  data.categories.length === 0
                    ? "Crie uma categoria antes de cadastrar o primeiro produto."
                    : "Cadastre o primeiro produto do catálogo."
                }
                action={
                  data.categories.length === 0 ? (
                    <Button asChild>
                      <Link href="/admin/categorias">Criar categoria</Link>
                    </Button>
                  ) : (
                    newButton
                  )
                }
              />
            )
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {data.products.length} {data.products.length === 1 ? "produto" : "produtos"}
              </p>
              <ProductsTable products={data.products} />
            </>
          )}
        </div>
      )}
    </>
  )
}
