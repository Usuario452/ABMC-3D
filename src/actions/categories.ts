"use server"

import { authorizeAdminAction } from "@/lib/auth/admin"
import { describeDbError, failure, success, validationFailure, type ActionResult } from "@/lib/actions/result"
import { catalogChanged } from "@/lib/actions/revalidate"
import { pgErrorCode } from "@/lib/db"
import { categorySchema, uuidSchema, type CategoryInput } from "@/lib/validation/schemas"

const DUPLICATE_SLUG = "Já existe uma categoria com este slug. Escolha outro."

function writeFailure(error: unknown) {
  const code = pgErrorCode(error)
  return failure(describeDbError({ code }, { duplicate: DUPLICATE_SLUG }), {
    fieldErrors: code === "23505" ? { slug: [DUPLICATE_SLUG] } : undefined,
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
    const [row] = await auth.sql<{ id: string }[]>`
      insert into categories (name, slug, is_active)
      values (${parsed.data.name}, ${parsed.data.slug}, ${parsed.data.isActive})
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
      set name = ${parsed.data.name}, slug = ${parsed.data.slug}, is_active = ${parsed.data.isActive}
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

  try {
    const [{ count }] = await auth.sql<{ count: number }[]>`
      select count(*)::int as count from products where category_id = ${parsedId.data}
    `
    if (count > 0) {
      return failure(
        `Esta categoria possui ${count} produto(s) vinculado(s). Mova os produtos para outra categoria ou exclua-os antes de excluir a categoria. Você também pode apenas desativá-la.`,
      )
    }

    const rows = await auth.sql`delete from categories where id = ${parsedId.data} returning id`
    if (rows.length === 0) return failure("Categoria não encontrada.")
  } catch (error) {
    const code = pgErrorCode(error)
    // 23001/23503: um produto foi vinculado entre a verificação e a exclusão (on delete restrict).
    return failure(
      code === "23001" || code === "23503" ? "Esta categoria possui produtos vinculados e não pode ser excluída." : describeDbError({ code }),
    )
  }

  catalogChanged()
  return success(null, "Categoria excluída.")
}
