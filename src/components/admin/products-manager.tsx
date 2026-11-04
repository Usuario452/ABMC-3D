"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { HiMagnifyingGlass, HiOutlineCube, HiOutlinePlus } from "react-icons/hi2"
import { getProductForEdit } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { PageHeader } from "@/components/admin/page-header"
import { ProductDialog } from "@/components/admin/product-dialog"
import {
  DEFAULT_PRODUCT_SORT,
  PRODUCT_STATUSES,
  matchesStatus,
  sortProducts,
  type ProductStatusFilter,
} from "@/components/admin/product-status"
import { ProductsTable, TablePagination } from "@/components/admin/products-table"
import { ProductsToolbar, type ProductFilters } from "@/components/admin/products-toolbar"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { AdminProduct, AdminProductListItem } from "@/lib/data/admin"

/** Produtos por página da tabela. */
const PAGE_SIZE = 15

/** Estado vazio no mesmo estilo dos cartões do painel (sombra, sem contorno tracejado). */
const EMPTY = "border-0 bg-card py-14 shadow-panel"

type CategoryOption = { id: string; name: string; is_active: boolean }

/** Modal aberto: cadastro, edição de um produto ou nenhum. */
export type ProductsModal = { mode: "new" } | { mode: "edit"; id: string } | null

export type ProductsViewState = ProductFilters & { page: number; modal: ProductsModal }

/** Busca sem diferenciar maiúsculas nem acentos. */
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

/** Endereço da tela, para links e para o botão recarregar voltarem ao mesmo ponto. */
function viewQuery({ q, categoria, status, ordem, page, modal }: ProductsViewState) {
  const params = new URLSearchParams()
  if (q.trim()) params.set("q", q.trim())
  if (categoria) params.set("categoria", categoria)
  if (status !== "todos") params.set("status", status)
  if (ordem !== DEFAULT_PRODUCT_SORT) params.set("ordem", ordem)
  if (page > 1) params.set("pagina", String(page))
  if (modal?.mode === "new") params.set("novo", "1")
  if (modal?.mode === "edit") params.set("editar", modal.id)
  return params.size > 0 ? `?${params}` : ""
}

/**
 * Lista de produtos do painel: busca, filtros, paginação e modais ficam em estado no cliente (resposta
 * imediata). A URL acompanha via history.replaceState, sem ir ao servidor; o servidor só entrega a lista
 * e é recarregado pelas Server Actions depois de salvar.
 */
export function ProductsManager({
  products,
  categories,
  initial,
  initialEditing,
}: {
  products: AdminProductListItem[]
  categories: CategoryOption[]
  /** Estado inicial lido da URL. */
  initial: ProductsViewState
  /** Produto já carregado quando a página abre com ?editar=<id>. */
  initialEditing: AdminProduct | null
}) {
  const feedback = useActionFeedback()
  const [filters, setFilters] = useState<ProductFilters>({
    q: initial.q,
    categoria: initial.categoria,
    status: initial.status,
    ordem: initial.ordem,
  })
  const [page, setPage] = useState(initial.page)
  const [modal, setModal] = useState<ProductsModal>(initial.modal)
  const [editing, setEditing] = useState<AdminProduct | null>(initialEditing)

  // Dados de edição já buscados (ao passar o mouse ou abrir): as buscas em andamento e as prontas.
  // Zerados quando a lista muda, pois o produto pode ter sido salvo.
  const pending = useRef(new Map<string, Promise<AdminProduct | null>>())
  const ready = useRef(new Map<string, AdminProduct>())
  useEffect(() => {
    pending.current.clear()
    ready.current.clear()
  }, [products])

  const load = (id: string) => {
    let request = pending.current.get(id)
    if (!request) {
      request = getProductForEdit(id)
        .then((result) => {
          if (result.ok) return result.data
          feedback(result)
          return null
        })
        .catch(() => {
          networkErrorToast()
          return null
        })
      pending.current.set(id, request)
      request.then((product) => {
        if (product) ready.current.set(id, product)
        // Falhas não ficam guardadas: a próxima tentativa busca de novo.
        else pending.current.delete(id)
      })
    }
    return request
  }

  // Produto que o modal está abrindo agora: respostas de outros (já fechados) são ignoradas.
  const opening = useRef<string | null>(null)
  const openEdit = (id: string) => {
    opening.current = id
    setModal({ mode: "edit", id })
    const cached = ready.current.get(id)
    setEditing(cached ?? null)
    if (cached) return
    load(id).then((product) => {
      if (opening.current !== id) return
      if (product) {
        setEditing(product)
      } else {
        opening.current = null
        setModal(null)
      }
    })
  }
  const closeModal = () => {
    opening.current = null
    setModal(null)
    setEditing(null)
  }

  // A URL acompanha o estado sem recarregar a página.
  useEffect(() => {
    const query = viewQuery({ ...filters, page, modal })
    if (query !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${query}`)
  }, [filters, page, modal])

  const changeFilters = (next: Partial<ProductFilters>) => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }

  // Busca e categoria limitam a lista; a situação é contada à parte para cada aba mostrar o total.
  const base = useMemo(() => {
    const term = normalize(filters.q.trim())
    return products.filter(
      (product) =>
        (!term || normalize(product.name).includes(term)) &&
        (!filters.categoria || product.categories.some((category) => category.id === filters.categoria)),
    )
  }, [products, filters.q, filters.categoria])
  const counts = Object.fromEntries(
    (Object.keys(PRODUCT_STATUSES) as ProductStatusFilter[]).map((key) => [
      key,
      base.filter((product) => matchesStatus(product, key)).length,
    ]),
  ) as Record<ProductStatusFilter, number>
  const filtered = sortProducts(
    base.filter((product) => matchesStatus(product, filters.status)),
    filters.ordem,
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  // A ordem não esconde produtos, então não conta como filtro para o estado vazio.
  const hasFilters = Boolean(filters.q.trim() || filters.categoria || filters.status !== "todos")

  const newButton = (
    <Button type="button" onClick={() => setModal({ mode: "new" })} className="max-sm:size-9 max-sm:px-0">
      <HiOutlinePlus aria-hidden />
      <span className="sr-only sm:not-sr-only">Novo produto</span>
    </Button>
  )

  return (
    <>
      {/* Busca, filtros e "Novo produto" ficam na linha do título, à direita. */}
      <PageHeader
        title="Produtos"
        description="Gerencie o catálogo da loja."
        actions={
          <ProductsToolbar
            filters={filters}
            onChange={changeFilters}
            categories={categories}
            counts={counts}
            action={newButton}
          />
        }
      />

      <div className="space-y-4">

        {visible.length === 0 ? (
          hasFilters ? (
            <StateMessage
              icon={HiMagnifyingGlass}
              title="Nenhum produto encontrado"
              description="Ajuste a busca, a categoria ou a situação."
              className={EMPTY}
              action={
                <Button type="button" variant="outline" onClick={() => changeFilters({ q: "", categoria: "", status: "todos" })}>
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <StateMessage
              icon={HiOutlineCube}
              title="Nenhum produto cadastrado"
              className={EMPTY}
              description="Cadastre o primeiro produto do catálogo. A categoria pode ser criada no próprio cadastro."
              action={newButton}
            />
          )
        ) : (
          <ProductsTable
            products={visible}
            onEdit={openEdit}
            onPrefetch={load}
            footer={
              <TablePagination
                page={currentPage}
                pageCount={pageCount}
                total={filtered.length}
                from={(currentPage - 1) * PAGE_SIZE + 1}
                to={(currentPage - 1) * PAGE_SIZE + visible.length}
                onPage={setPage}
              />
            }
          />
        )}
      </div>

      {modal?.mode === "new" ? <ProductDialog key="novo" categories={categories} onClose={closeModal} /> : null}
      {modal?.mode === "edit" && editing ? (
        <ProductDialog key={editing.id} product={editing} categories={categories} onClose={closeModal} />
      ) : null}
      {modal?.mode === "edit" && !editing ? <LoadingDialog onClose={closeModal} /> : null}
    </>
  )
}

/** Enquanto os dados do produto chegam (só quando não foram pré-carregados). */
function LoadingDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="sr-only">Carregando produto</DialogTitle>
        <DialogDescription className="sr-only">Aguarde enquanto os dados do produto são carregados.</DialogDescription>
        <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
          <span className="size-6 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-hidden />
          Carregando produto…
        </div>
      </DialogContent>
    </Dialog>
  )
}
