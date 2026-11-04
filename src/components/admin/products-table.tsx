"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { HiChevronLeft, HiChevronRight, HiOutlineEyeSlash, HiOutlinePhoto, HiOutlineTrash, HiStar } from "react-icons/hi2"
import { MdEdit } from "react-icons/md"
import { deleteProduct, setProductFlag } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { ConfirmAction, ConfirmDelete } from "@/components/admin/confirm-delete"
import { ProductStatusBadge } from "@/components/admin/product-status"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminProductListItem } from "@/lib/data/admin"
import { formatPrice } from "@/lib/format"

const HEAD = "h-10 px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:px-4"

export function ProductsTable({
  products,
  onEdit,
  onPrefetch,
  footer,
}: {
  products: AdminProductListItem[]
  /** Abre o modal de edição do produto. */
  onEdit: (id: string) => void
  /** Começa a carregar os dados de edição (ao passar o mouse), para o modal abrir sem espera. */
  onPrefetch?: (id: string) => void
  /** Rodapé do cartão (paginação). */
  footer?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-panel">
      <Table>
        <TableHeader className="[&_tr]:border-border/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>Produto</TableHead>
            <TableHead className={`${HEAD} hidden lg:table-cell`}>Situação</TableHead>
            <TableHead className={`${HEAD} hidden text-center md:table-cell`} title="Pessoas que adicionaram o produto ao carrinho">
              Intenções
            </TableHead>
            <TableHead className={`${HEAD} hidden text-right md:table-cell`}>Preço</TableHead>
            <TableHead className={`${HEAD} text-center`}>Ativo</TableHead>
            <TableHead className={`${HEAD} hidden w-0 sm:table-cell`}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} onEdit={onEdit} onPrefetch={onPrefetch} />
          ))}
        </TableBody>
      </Table>
      {footer}
    </div>
  )
}

/** Rodapé da tabela: faixa exibida e navegação entre páginas, mantendo os filtros. */
export function TablePagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPage,
  noun = ["produto", "produtos"],
}: {
  page: number
  pageCount: number
  total: number
  from: number
  to: number
  onPage: (page: number) => void
  /** Nome do item no singular e no plural, para o total ("3 produtos"). */
  noun?: [string, string]
}) {
  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5 text-xs text-muted-foreground sm:px-4"
    >
      <span className="tabular-nums">
        {from}–{to} de {total} {total === 1 ? noun[0] : noun[1]}
      </span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <PageButton disabled={page <= 1} onClick={() => onPage(page - 1)} label="Página anterior">
            <HiChevronLeft className="size-4" aria-hidden />
          </PageButton>
          <span className="min-w-20 text-center tabular-nums" aria-current="page">
            {page} de {pageCount}
          </span>
          <PageButton disabled={page >= pageCount} onClick={() => onPage(page + 1)} label="Próxima página">
            <HiChevronRight className="size-4" aria-hidden />
          </PageButton>
        </div>
      ) : null}
    </nav>
  )
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-8" disabled={disabled} onClick={onClick} aria-label={label}>
      {children}
    </Button>
  )
}

function ProductRow({
  product,
  onEdit,
  onPrefetch,
}: {
  product: AdminProductListItem
  onEdit: (id: string) => void
  onPrefetch?: (id: string) => void
}) {
  const feedback = useActionFeedback()
  const edit = () => onEdit(product.id)
  const [isPending, startTransition] = useTransition()

  const toggle = (flag: "is_active", value: boolean) =>
    startTransition(async () => {
      try {
        feedback(await setProductFlag(product.id, flag, value))
      } catch {
        networkErrorToast()
      }
    })

  // Ativar é imediato; desativar tira o produto da loja, então pede confirmação.
  const [confirmingOff, setConfirmingOff] = useState(false)
  const deactivate = async () => {
    try {
      return feedback(await setProductFlag(product.id, "is_active", false))
    } catch {
      networkErrorToast()
      return false
    }
  }

  const remove = async () => {
    try {
      return feedback(await deleteProduct(product.id))
    } catch {
      networkErrorToast()
      return false
    }
  }

  return (
    <TableRow
      className="group cursor-pointer border-border/60 transition-colors hover:bg-muted/40"
      onPointerEnter={() => onPrefetch?.(product.id)}
      onClick={(event) => {
        // Clicar na linha abre a edição; botões, links, o interruptor e o modal de exclusão (portal) não.
        const target = event.target as HTMLElement
        if (!event.currentTarget.contains(target) || target.closest("a, button, input, [role=switch]")) return
        edit()
      }}
    >
      {/* w-full + max-w-0: a coluna do produto ocupa o espaço que sobra e o nome é cortado, sem rolagem lateral. */}
      <TableCell className="w-full max-w-0 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          >
            {product.image?.url ? (
              <Image src={product.image.url} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <HiOutlinePhoto className="size-5 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={edit}
                className="line-clamp-2 rounded-sm text-left font-medium break-words whitespace-normal transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-ring sm:truncate sm:whitespace-nowrap"
              >
                {product.name}
              </button>
              {product.is_featured ? (
                <HiStar className="size-3.5 shrink-0 text-gold" aria-label="Destaque" role="img" />
              ) : null}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="max-w-full truncate">
                {product.categories.length > 0
                  ? product.categories.map((category) => category.name).join(", ")
                  : "Sem categoria"}
              </span>
              <span className="font-medium text-foreground tabular-nums md:hidden">{formatPrice(product.price_cents)}</span>
              {!product.image ? <span className="text-destructive">Sem foto</span> : null}
            </p>
            <ProductStatusBadge product={product} className="mt-1.5 lg:hidden" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden px-4 lg:table-cell">
        <ProductStatusBadge product={product} />
      </TableCell>
      <TableCell className="hidden px-4 text-center tabular-nums md:table-cell">
        <span
          title={`${product.cartIntents} ${product.cartIntents === 1 ? "pessoa adicionou" : "pessoas adicionaram"} ao carrinho`}
          className={product.cartIntents > 0 ? "font-medium" : "text-muted-foreground"}
        >
          {product.cartIntents}
        </span>
      </TableCell>
      <TableCell className="hidden px-4 text-right font-medium tabular-nums md:table-cell">
        {formatPrice(product.price_cents)}
      </TableCell>
      <TableCell className="px-3 text-center sm:px-4">
        <Switch
          checked={product.is_active}
          disabled={isPending}
          onCheckedChange={(value) => (value ? toggle("is_active", true) : setConfirmingOff(true))}
          aria-label={`${product.is_active ? "Desativar" : "Ativar"} ${product.name}`}
        />
        <ConfirmAction
          open={confirmingOff}
          onOpenChange={setConfirmingOff}
          icon={HiOutlineEyeSlash}
          tone="warning"
          title="Desativar produto?"
          description={
            <>
              <strong className="font-medium text-foreground">{product.name}</strong> sai da loja até ser ativado de novo. Ele
              continua no painel, com fotos e dados.
            </>
          }
          confirmLabel="Desativar"
          pendingLabel="Desativando…"
          onConfirm={deactivate}
        />
      </TableCell>
      {/* No celular, tocar na linha abre a edição (e o excluir fica no modal), para sobrar espaço ao nome. */}
      <TableCell className="hidden px-2 sm:table-cell sm:px-3">
        <div className="flex justify-end gap-0.5 whitespace-nowrap opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={edit} aria-label={`Editar ${product.name}`}>
            <MdEdit className="size-4" aria-hidden />
          </Button>
          <ConfirmDelete
            title="Excluir produto?"
            description={<><strong className="font-medium text-foreground">{product.name}</strong> e as fotos serão apagados de vez. Para só ocultar da loja, desative-o.</>}
            onConfirm={remove}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Excluir ${product.name}`}
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
