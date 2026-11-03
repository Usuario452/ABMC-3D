"use server"

import { authorizeAdminAction } from "@/lib/auth/admin"
import { failure, success, type ActionResult } from "@/lib/actions/result"
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images"
import { fetchMakerWorldModel, parseMakerWorldId, type MakerWorldModel } from "@/lib/makerworld"

/** Busca nome, descrição (Markdown), fotos e licença de um modelo do MakerWorld pelo link. */
export async function importFromMakerWorld(link: unknown): Promise<ActionResult<MakerWorldModel>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const id = typeof link === "string" ? parseMakerWorldId(link) : null
  if (!id) return failure("Cole o link de um modelo do MakerWorld (ex.: makerworld.com/en/models/123…).")

  try {
    const lookup = await fetchMakerWorldModel(id, MAX_IMAGES_PER_PRODUCT)
    if (!lookup.ok) {
      return failure(
        lookup.reason === "blocked"
          ? "O MakerWorld bloqueou a consulta automática. Tente mais tarde ou preencha à mão."
          : "Modelo não encontrado no MakerWorld. Confira o link.",
      )
    }
    return success(lookup.model, "Dados importados. Revise antes de criar.")
  } catch {
    return failure("Não foi possível consultar o MakerWorld agora. Tente de novo ou preencha à mão.")
  }
}
