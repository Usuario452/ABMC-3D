"use client"

import Image from "next/image"
import Link from "next/link"
import { useTransition } from "react"
import { HiOutlinePencilSquare, HiOutlinePhoto, HiOutlineTrash } from "react-icons/hi2"
import { deleteProduct, setProductFlag } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { ConfirmDelete } from "@/components/admin/confirm-delete"
import { ProductStatusBadge } from "@/components/admin/product-status"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminProductListItem } from "@/lib/data/admin"
import { formatPrice } from "@/lib/format"

const HEAD = "h-12 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-4"

export function ProductsTable({ products }: { products: AdminProductListItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>Produto</TableHead>
            <TableHead className={`${HEAD} hidden md:table-cell`}>Categoria</TableHead>
            <TableHead className={`${HEAD} hidden text-right md:table-cell`}>Preço</TableHead>
            <TableHead className={HEAD}>Ativo</TableHead>
            <TableHead className={`${HEAD} hidden sm:table-cell`}>Disponível</TableHead>
            <TableHead className={`${HEAD} text-right`}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProductRow({ product }: { product: AdminProductListItem }) {
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()

  const toggle = (flag: "is_active" | "is_available", value: boolean) =>
    startTransition(async () => {
      try {
        feedback(await setProductFlag(product.id, flag, value))
      } catch {
        networkErrorToast()
      }
    })

  const remove = async () => {
    try {
      return feedback(await deleteProduct(product.id))
    } catch {
      networkErrorToast()
      return false
    }
  }

  return (
    <TableRow className="h-20">
      <TableCell className="px-2 sm:px-4">
        <div className="flex items-center gap-3 sm:min-w-56 sm:gap-4">
          <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:size-14">
            {product.image?.url ? (
              <Image src={product.image.url} alt="" fill sizes="56px" className="object-cover" />
            ) : (
              <HiOutlinePhoto className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <Link href={`/admin/produtos/${product.id}`} className="line-clamp-2 font-semibold hover:text-gold">
              {product.name}
            </Link>
            <span className="mt-0.5 block text-sm font-semibold tabular-nums md:hidden">
              {formatPrice(product.price_cents)}
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <ProductStatusBadge product={product} />
              {product.is_featured ? (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">Destaque</span>
              ) : null}
              {!product.image ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  Sem imagem
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden px-4 text-muted-foreground md:table-cell">{product.category?.name ?? "—"}</TableCell>
      <TableCell className="hidden px-4 text-right font-semibold tabular-nums md:table-cell">
        {formatPrice(product.price_cents)}
      </TableCell>
      <TableCell className="px-2 sm:px-4">
        <Switch
          checked={product.is_active}
          disabled={isPending}
          onCheckedChange={(value) => toggle("is_active", value)}
          aria-label={`${product.is_active ? "Desativar" : "Ativar"} ${product.name}`}
        />
      </TableCell>
      <TableCell className="hidden px-4 sm:table-cell">
        <Switch
          checked={product.is_available}
          disabled={isPending}
          onCheckedChange={(value) => toggle("is_available", value)}
          aria-label={`Marcar ${product.name} como ${product.is_available ? "indisponível" : "disponível"}`}
        />
      </TableCell>
      <TableCell className="px-2 text-right sm:px-4">
        <div className="flex justify-end gap-0.5 sm:gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/produtos/${product.id}`} aria-label={`Editar ${product.name}`}>
              <HiOutlinePencilSquare className="size-5" aria-hidden />
            </Link>
          </Button>
          <ConfirmDelete
            title={`Excluir “${product.name}”?`}
            description="O produto e todas as suas imagens serão excluídos permanentemente. Para apenas ocultá-lo da loja, desative-o."
            onConfirm={remove}
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Excluir ${product.name}`}>
                <HiOutlineTrash className="size-5" aria-hidden />
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
