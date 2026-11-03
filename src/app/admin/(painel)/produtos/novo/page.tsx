import { redirect } from "next/navigation"

/** O cadastro de produto é um modal na lista; este endereço continua valendo e abre o modal. */
export default function NewProductPage() {
  redirect("/admin/produtos?novo=1")
}
