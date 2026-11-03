import { notFound, redirect } from "next/navigation"
import { uuidSchema } from "@/lib/validation/schemas"

/** A edição de produto é um modal na lista; este endereço continua valendo e abre o modal. */
export default async function EditProductPage({ params }: PageProps<"/admin/produtos/[id]">) {
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()
  redirect(`/admin/produtos?editar=${id}`)
}
