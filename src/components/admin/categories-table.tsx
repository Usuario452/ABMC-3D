"use client"

import { useTransition } from "react"
import { HiOutlinePencilSquare, HiOutlineTag, HiOutlineTrash } from "react-icons/hi2"
import { deleteCategory, setCategoryActive } from "@/actions/categories"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { CategoryFormDialog } from "@/components/admin/category-form-dialog"
import { ConfirmDelete } from "@/components/admin/confirm-delete"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminCategory } from "@/lib/data/admin"

const HEAD = "h-12 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase"

export function CategoriesTable({ categories }: { categories: AdminCategory[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>Nome</TableHead>
            <TableHead className={`${HEAD} hidden sm:table-cell`}>Slug</TableHead>
            <TableHead className={`${HEAD} text-center`}>Produtos</TableHead>
            <TableHead className={HEAD}>Ativa</TableHead>
            <TableHead className={`${HEAD} text-right`}>
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

  const remove = async () => {
    try {
      return feedback(await deleteCategory(category.id))
    } catch {
      networkErrorToast()
      return false
    }
  }

  return (
    <TableRow className="h-16">
      <TableCell className="px-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <HiOutlineTag className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">{category.name}</span>
          {!category.is_active ? <Badge variant="secondary">Inativa</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="hidden px-4 font-mono text-xs text-muted-foreground sm:table-cell">{category.slug}</TableCell>
      <TableCell className="px-4 text-center">
        <span className="inline-flex min-w-8 justify-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium tabular-nums">
          {category.productCount}
        </span>
      </TableCell>
      <TableCell className="px-4">
        <Switch
          checked={category.is_active}
          onCheckedChange={toggle}
          disabled={isPending}
          aria-label={`${category.is_active ? "Desativar" : "Ativar"} categoria ${category.name}`}
        />
      </TableCell>
      <TableCell className="px-4 text-right">
        <div className="flex justify-end gap-1">
          <CategoryFormDialog
            category={category}
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Editar ${category.name}`}>
                <HiOutlinePencilSquare className="size-5" aria-hidden />
              </Button>
            }
          />
          <ConfirmDelete
            title={`Excluir “${category.name}”?`}
            description={
              category.productCount > 0
                ? `Esta categoria possui ${category.productCount} produto(s) vinculado(s) e não pode ser excluída. Mova os produtos para outra categoria ou desative a categoria.`
                : "A categoria será excluída permanentemente."
            }
            confirmDisabled={category.productCount > 0}
            onConfirm={remove}
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Excluir ${category.name}`}>
                <HiOutlineTrash className="size-5" aria-hidden />
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
