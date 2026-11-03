"use server"

import { randomUUID } from "node:crypto"
import { authorizeAdminAction } from "@/lib/auth/admin"
import { describeDbError, failure, success, validationFailure, type ActionResult } from "@/lib/actions/result"
import { catalogChanged } from "@/lib/actions/revalidate"
import { uniqueSlug } from "@/lib/data/unique-slug"
import { pgErrorCode } from "@/lib/db"
import { optimizeProductImage } from "@/lib/image-optimize"
import { MAX_IMAGE_BYTES, buildCategoryCoverPath, detectImageType } from "@/lib/images"
import { deleteObjects, getProductImageUrl, putObject } from "@/lib/r2"
import { categorySchema, uuidSchema, type CategoryInput } from "@/lib/validation/schemas"

const DUPLICATE_SLUG = "Já existe uma categoria com este endereço. Tente salvar de novo."

function writeFailure(error: unknown) {
  const code = pgErrorCode(error)
  return failure(describeDbError({ code }, { duplicate: DUPLICATE_SLUG }), {
    fieldErrors: code === "23505" ? { name: [DUPLICATE_SLUG] } : undefined,
  })
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    const slug = await uniqueSlug(auth.sql, "categories", parsed.data.name, "categoria")
    const [row] = await auth.sql<{ id: string }[]>`
      insert into categories (name, slug, is_active)
      values (${parsed.data.name}, ${slug}, ${parsed.data.isActive})
      returning id
    `
    catalogChanged()
    return success({ id: row.id }, "Categoria criada.")
  } catch (error) {
    return writeFailure(error)
  }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  const parsed = categorySchema.safeParse(input)
  if (!parsedId.success) return failure("Categoria inválida.")
  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    const rows = await auth.sql`
      update categories
      set name = ${parsed.data.name}, is_active = ${parsed.data.isActive}
      where id = ${parsedId.data}
      returning id
    `
    if (rows.length === 0) return failure("Categoria não encontrada.")
  } catch (error) {
    return writeFailure(error)
  }

  catalogChanged()
  return success(null, "Categoria atualizada.")
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success || typeof isActive !== "boolean") return failure("Dados inválidos.")

  try {
    const rows = await auth.sql`
      update categories set is_active = ${isActive} where id = ${parsedId.data} returning id
    `
    if (rows.length === 0) return failure("Categoria não encontrada.")
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  catalogChanged()
  return success(null, isActive ? "Categoria ativada." : "Categoria desativada.")
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return failure("Categoria inválida.")

  let coverPath: string | null = null
  try {
    const [{ count }] = await auth.sql<{ count: number }[]>`
      select count(*)::int as count from products where category_id = ${parsedId.data}
    `
    if (count > 0) {
      return failure(
        `Esta categoria possui ${count} produto(s) vinculado(s). Mova os produtos para outra categoria ou exclua-os antes de excluir a categoria. Você também pode apenas desativá-la.`,
      )
    }

    const rows = await auth.sql<{ cover_path: string | null }[]>`
      delete from categories where id = ${parsedId.data} returning cover_path
    `
    if (rows.length === 0) return failure("Categoria não encontrada.")
    coverPath = rows[0].cover_path
  } catch (error) {
    const code = pgErrorCode(error)
    // 23001/23503: um produto foi vinculado entre a verificação e a exclusão (on delete restrict).
    return failure(
      code === "23001" || code === "23503" ? "Esta categoria possui produtos vinculados e não pode ser excluída." : describeDbError({ code }),
    )
  }

  catalogChanged()
  // O registro sai antes do arquivo: uma falha no R2 deixa no máximo um arquivo órfão.
  if (coverPath) {
    const removal = await deleteObjects([coverPath])
    if (!removal.ok) console.error("[categories] remoção da capa no R2:", removal.error)
  }
  return success(null, "Categoria excluída.")
}

const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)

/** Envia (ou troca) a capa da categoria: guardada como WebP otimizado; a anterior é apagada do R2. */
export async function uploadCategoryCover(formData: FormData): Promise<ActionResult<{ url: string | null }>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const categoryId = uuidSchema.safeParse(formData.get("categoryId"))
  if (!categoryId.success) return failure("Categoria inválida.")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return failure("Selecione uma imagem para a capa.")
  if (file.size > MAX_IMAGE_BYTES) return failure(`A capa deve ter no máximo ${MAX_MB} MB.`)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!detectImageType(bytes)) return failure("Formato não suportado. Envie uma imagem JPEG, PNG ou WebP.")

  let previous: string | null
  try {
    const [category] = await auth.sql<{ cover_path: string | null }[]>`
      select cover_path from categories where id = ${categoryId.data}
    `
    if (!category) return failure("Categoria não encontrada.")
    previous = category.cover_path
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  let optimized: Uint8Array<ArrayBuffer>
  try {
    optimized = (await optimizeProductImage(bytes)).bytes
  } catch {
    return failure("Não foi possível processar a imagem. Verifique se o arquivo não está corrompido.")
  }

  const coverPath = buildCategoryCoverPath(categoryId.data, randomUUID())
  const upload = await putObject(coverPath, optimized, "image/webp")
  if (!upload.ok) {
    console.error("[categories] envio da capa ao R2:", upload.error)
    return failure("Falha ao enviar a capa para o armazenamento. Tente novamente.")
  }

  try {
    const rows = await auth.sql`
      update categories set cover_path = ${coverPath} where id = ${categoryId.data} returning id
    `
    if (rows.length === 0) {
      await deleteObjects([coverPath])
      return failure("Categoria não encontrada.")
    }
  } catch (error) {
    // Desfaz o envio para não deixar arquivo sem registro.
    await deleteObjects([coverPath])
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  if (previous) await deleteObjects([previous])
  catalogChanged()
  return success({ url: getProductImageUrl(coverPath) }, "Capa salva.")
}

/** Tira a capa da categoria e apaga o arquivo do R2. */
export async function removeCategoryCover(id: string): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return failure("Categoria inválida.")

  let previous: string | null
  try {
    const rows = await auth.sql<{ cover_path: string | null }[]>`
      update categories c set cover_path = null
      from (select id, cover_path from categories where id = ${parsedId.data} for update) old
      where c.id = old.id
      returning old.cover_path
    `
    if (rows.length === 0) return failure("Categoria não encontrada.")
    previous = rows[0].cover_path
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  if (previous) {
    const removal = await deleteObjects([previous])
    if (!removal.ok) console.error("[categories] remoção da capa no R2:", removal.error)
  }
  catalogChanged()
  return success(null, "Capa removida.")
}
