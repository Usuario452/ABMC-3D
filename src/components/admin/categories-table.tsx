"use client"

import Image from "next/image"
import { type ReactNode, useState, useTransition } from "react"
import { MdEdit } from "react-icons/md"
import { HiMagnifyingGlass, HiOutlineEyeSlash, HiOutlineTag, HiOutlineTrash } from "react-icons/hi2"
import { deleteCategory, setCategoryActive } from "@/actions/categories"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { CategoryFormDialog } from "@/components/admin/category-form-dialog"
import { ConfirmAction, ConfirmDelete } from "@/components/admin/confirm-delete"
import { PageHeader } from "@/components/admin/page-header"
import { TablePagination } from "@/components/admin/products-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminCategory } from "@/lib/data/admin"

const HEAD = "h-10 px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:px-4"

/** Categorias por página da tabela. */
const PAGE_SIZE = 15

export function CategoriesTable({ categories, footer }: { categories: AdminCategory[]; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-panel">
      <Table>
        <TableHeader className="[&_tr]:border-border/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>Categoria</TableHead>
            <TableHead className={`${HEAD} hidden text-center sm:table-cell`}>Produtos</TableHead>
            <TableHead className={`${HEAD} text-center`}>Ativa</TableHead>
            <TableHead className={`${HEAD} w-0`}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </TableBody>
      </Table>
      {footer}
    </div>
  )
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()

  const toggle = (value: boolean) =>
    startTransition(async () => {
      try {
        feedback(await setCategoryActive(category.id, value))
      } catch {
        networkErrorToast()
      }
    })

  // Ativar é imediato; desativar esconde a categoria e os produtos dela, então pede confirmação.
  const [confirmingOff, setConfirmingOff] = useState(false)
  const deactivate = async () => {
    try {
      return feedback(await setCategoryActive(category.id, false))
    } catch {
      networkErrorToast()
      return false
    }
  }

  const remove = async () => {
    try {
      return feedback(await deleteCategory(category.id))
    } catch {
      networkErrorToast()
      return false
    }
  }

  return (
    <TableRow className="group border-border/60 transition-colors hover:bg-muted/40">
      <TableCell className="w-full max-w-0 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          {/* Miniatura da capa, quando houver; sem capa, o ícone de categoria. */}
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gold/10 text-gold">
            {category.coverUrl ? (
              <Image src={category.coverUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <HiOutlineTag className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate font-medium">{category.name}</span>
              {!category.is_active ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Inativa</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {/* No celular a contagem vem aqui, no lugar da coluna "Produtos". */}
              <span className="sm:hidden">
                {category.productCount} {category.productCount === 1 ? "produto" : "produtos"}
              </span>
              <span className="hidden sm:inline">?categoria={category.slug}</span>
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden px-3 text-center tabular-nums sm:table-cell sm:px-4">{category.productCount}</TableCell>
      <TableCell className="px-3 text-center sm:px-4">
        <Switch
          checked={category.is_active}
          onCheckedChange={(value) => (value ? toggle(true) : setConfirmingOff(true))}
          disabled={isPending}
          aria-label={`${category.is_active ? "Desativar" : "Ativar"} categoria ${category.name}`}
        />
        <ConfirmAction
          open={confirmingOff}
          onOpenChange={setConfirmingOff}
          icon={HiOutlineEyeSlash}
          tone="warning"
          title="Desativar categoria?"
          description={
            <>
              <strong className="font-medium text-foreground">{category.name}</strong>
              {category.productCount > 0
                ? ` e ${category.productCount === 1 ? "o produto dela saem" : `os ${category.productCount} produtos dela saem`} da loja`
                : " sai da loja"}{" "}
              até ser ativada de novo. Os produtos mantêm o próprio status e voltam como estavam ao reativar.
            </>
          }
          confirmLabel="Desativar"
          pendingLabel="Desativando…"
          onConfirm={deactivate}
        />
      </TableCell>
      <TableCell className="px-2 sm:px-3">
        <div className="flex justify-end gap-0.5 whitespace-nowrap opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <CategoryFormDialog
            category={category}
            trigger={
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${category.name}`}>
                <MdEdit className="size-4" aria-hidden />
              </Button>
            }
          />
          <ConfirmDelete
            title={category.productCount > 0 ? "Categoria em uso" : "Excluir categoria?"}
            description={
              category.productCount > 0 ? (
                <>
                  <strong className="font-medium text-foreground">{category.name}</strong> tem {category.productCount}{" "}
                  {category.productCount === 1 ? "produto" : "produtos"}. Mova-os para outra categoria ou desative-a.
                </>
              ) : (
                <>
                  <strong className="font-medium text-foreground">{category.name}</strong> será apagada de vez.
                </>
              )
            }
            confirmDisabled={category.productCount > 0}
            onConfirm={remove}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Excluir ${category.name}`}
              >
                <HiOutlineTrash className="size-4" aria-hidden />
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

/**
 * Cabeçalho com busca (filtra a lista no navegador, que é pequena) e ação principal à direita do título,
 * com a tabela abaixo.
 */
export function CategoriesView({ categories, action }: { categories: AdminCategory[]; action: ReactNode }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const term = search.trim().toLocaleLowerCase("pt-BR")
  const filtered = term
    ? categories.filter((category) => `${category.name} ${category.slug}`.toLocaleLowerCase("pt-BR").includes(term))
    : categories
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize os produtos do catálogo."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div role="search" className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <Label htmlFor="category-search" className="sr-only">
                Buscar categoria
              </Label>
              <HiMagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="category-search"
                type="search"
                autoComplete="off"
                placeholder="Buscar categoria"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                className="h-9 border-transparent bg-card pl-9 shadow-panel"
              />
            </div>
            {action}
          </div>
        }
      />
      {visible.length > 0 ? (
        <CategoriesTable
          categories={visible}
          footer={
            <TablePagination
              page={currentPage}
              pageCount={pageCount}
              total={filtered.length}
              from={(currentPage - 1) * PAGE_SIZE + 1}
              to={(currentPage - 1) * PAGE_SIZE + visible.length}
              onPage={setPage}
              noun={["categoria", "categorias"]}
            />
          }
        />
      ) : (
        <p className="rounded-lg bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-panel">
          Nenhuma categoria encontrada para “{search.trim()}”.
        </p>
      )}
    </>
  )
}
