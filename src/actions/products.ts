"use server"

import { authorizeAdminAction } from "@/lib/auth/admin"
import { describeDbError, failure, success, validationFailure, type ActionResult } from "@/lib/actions/result"
import { catalogChanged } from "@/lib/actions/revalidate"
import { getAdminProduct, type AdminProduct } from "@/lib/data/admin"
import { uniqueSlug } from "@/lib/data/unique-slug"
import type { TransactionSql } from "postgres"
import { pgErrorCode } from "@/lib/db"
import { deleteObjects } from "@/lib/r2"
import { productSchema, uuidSchema, type ProductData, type ProductInput } from "@/lib/validation/schemas"

const DUPLICATE_SLUG = "Já existe um produto com este endereço. Tente salvar de novo."

/** Substitui as categorias do produto pela lista informada, na ordem (dentro da transação). */
async function saveCategories(tx: TransactionSql, productId: string, categoryIds: string[]) {
  await tx`delete from product_categories where product_id = ${productId}`
  await tx`
    insert into product_categories ${tx(
      categoryIds.map((categoryId, position) => ({ product_id: productId, category_id: categoryId, position })),
    )}
  `
}

/** Campos editáveis. O slug fica de fora: é gerado na criação e não muda depois (links continuam valendo). */
function toRow(data: ProductData) {
  return {
    name: data.name,
    description: data.description,
    internal_notes: data.internalNotes,
    price_cents: data.price,
    // A primeira categoria escolhida; a lista completa fica em product_categories.
    category_id: data.categoryIds[0],
    is_active: data.isActive,
    is_available: data.isAvailable,
    is_featured: data.isFeatured,
  }
}

function writeFailure(error: unknown) {
  const code = pgErrorCode(error)
  if (code === "23503") {
    return failure("Uma das categorias selecionadas não existe mais.", {
      fieldErrors: { categoryIds: ["Selecione categorias válidas."] },
    })
  }
  return failure(describeDbError({ code }, { duplicate: DUPLICATE_SLUG }), {
    fieldErrors: code === "23505" ? { slug: [DUPLICATE_SLUG] } : undefined,
  })
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return validationFailure(parsed.error)

  try {
    const slug = await uniqueSlug(auth.sql, "products", parsed.data.name, "produto")
    const id = await auth.sql.begin(async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into products ${tx({ ...toRow(parsed.data), slug })} returning id
      `
      await saveCategories(tx, row.id, parsed.data.categoryIds)
      return row.id
    })
    catalogChanged()
    return success({ id }, "Produto criado.")
  } catch (error) {
    return writeFailure(error)
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return failure("Produto inválido.")
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return validationFailure(parsed.error)

  try {
    const found = await auth.sql.begin(async (tx) => {
      const rows = await tx`
        update products set ${tx(toRow(parsed.data))} where id = ${parsedId.data} returning id
      `
      if (rows.length === 0) return false
      await saveCategories(tx, parsedId.data, parsed.data.categoryIds)
      return true
    })
    if (!found) return failure("Produto não encontrado.")
  } catch (error) {
    return writeFailure(error)
  }

  catalogChanged()
  return success(null, "Produto atualizado.")
}

type ProductFlag = "is_active" | "is_available" | "is_featured"

const FLAG_MESSAGES: Record<ProductFlag, [string, string]> = {
  is_active: ["Produto ativado.", "Produto desativado."],
  is_available: ["Produto marcado como disponível.", "Produto marcado como indisponível."],
  is_featured: ["Produto adicionado aos destaques.", "Produto removido dos destaques."],
}

export async function setProductFlag(id: string, flag: ProductFlag, value: boolean): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success || !Object.hasOwn(FLAG_MESSAGES, flag) || typeof value !== "boolean") {
    return failure("Dados inválidos.")
  }

  try {
    // A coluna vem de FLAG_MESSAGES (validada acima), nunca do texto enviado.
    const rows = await auth.sql`
      update products set ${auth.sql({ [flag]: value })} where id = ${parsedId.data} returning id
    `
    if (rows.length === 0) return failure("Produto não encontrado.")
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  catalogChanged()
  return success(null, FLAG_MESSAGES[flag][value ? 0 : 1])
}

/** Dados completos de um produto (descrição, anotação e fotos) para abrir o modal de edição sem recarregar a página. */
export async function getProductForEdit(id: string): Promise<ActionResult<AdminProduct>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return failure("Produto inválido.")

  try {
    const product = await getAdminProduct(parsedId.data)
    return product ? success(product) : failure("Produto não encontrado.")
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return failure("Produto inválido.")

  let paths: string[] | null
  try {
    // Exclui primeiro o registro (as imagens saem em cascata) e só depois os arquivos:
    // uma falha no R2 deixa no máximo um arquivo órfão, nunca um registro quebrado.
    paths = await auth.sql.begin(async (tx) => {
      const images = await tx<{ storage_path: string }[]>`
        select storage_path from product_images where product_id = ${parsedId.data}
      `
      const deleted = await tx`delete from products where id = ${parsedId.data} returning id`
      return deleted.length === 0 ? null : images.map((image) => image.storage_path)
    })
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }
  if (paths === null) return failure("Produto não encontrado.")

  catalogChanged()

  // storage_path é único: os arquivos pertencem só às imagens deste produto.
  const removal = await deleteObjects(paths)
  if (!removal.ok) {
    console.error("[products] remoção R2:", removal.error)
    return success(null, "Produto excluído, mas alguns arquivos de imagem não puderam ser removidos do armazenamento.")
  }

  return success(null, "Produto excluído.")
}
