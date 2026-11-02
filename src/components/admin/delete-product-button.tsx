"use client"

import { useRouter } from "next/navigation"
import { HiOutlineTrash } from "react-icons/hi2"
import { deleteProduct } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { ConfirmDelete } from "@/components/admin/confirm-delete"
import { Button } from "@/components/ui/button"

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const feedback = useActionFeedback()

  return (
    <ConfirmDelete
      title={`Excluir “${productName}”?`}
      description="O produto e todas as suas imagens serão excluídos permanentemente. Para apenas ocultá-lo da loja, desative-o."
      onConfirm={async () => {
        try {
          const ok = feedback(await deleteProduct(productId))
          if (ok) router.push("/admin/produtos")
          return ok
        } catch {
          networkErrorToast()
          return false
        }
      }}
      trigger={
        <Button variant="destructive">
          <HiOutlineTrash aria-hidden />
          Excluir produto
        </Button>
      }
    />
  )
}
