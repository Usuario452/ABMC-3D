import "server-only"

import { randomUUID } from "node:crypto"
import { failure, success, type ActionResult } from "@/lib/actions/result"
import { MAX_IMAGE_BYTES, buildStoragePath, detectImageType } from "@/lib/images"
import { optimizeProductImage } from "@/lib/image-optimize"
import { fetchMakerWorldImage } from "@/lib/makerworld"
import { putObject } from "@/lib/r2"
import { uuidSchema } from "@/lib/validation/schemas"

const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)

/**
 * Processa uma foto e grava no R2, sem registrar no banco (registerProductImages grava todas de uma vez,
 * na ordem). A foto vem do computador (`file`) ou é um link do MakerWorld (`url`), baixado aqui no
 * servidor. Quem chama já conferiu a sessão do admin.
 */
export async function storeImageFromForm(formData: FormData): Promise<ActionResult<{ storagePath: string }>> {
  const productId = uuidSchema.safeParse(formData.get("productId"))
  if (!productId.success) return failure("Produto inválido.")

  const file = formData.get("file")
  const url = formData.get("url")
  let bytes: Uint8Array<ArrayBuffer> | null = null
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return failure(`A imagem deve ter no máximo ${MAX_MB} MB.`)
    bytes = new Uint8Array(await file.arrayBuffer())
  } else if (typeof url === "string") {
    bytes = await fetchMakerWorldImage(url, MAX_IMAGE_BYTES * 4)
    if (!bytes) return failure("Não foi possível baixar uma foto do MakerWorld.")
  } else {
    return failure("Selecione um arquivo de imagem.")
  }
  if (!detectImageType(bytes)) return failure("Formato não suportado. Envie imagens JPEG, PNG ou WebP.")

  let optimized: Uint8Array<ArrayBuffer>
  try {
    optimized = (await optimizeProductImage(bytes)).bytes
  } catch {
    return failure("Não foi possível processar a imagem. Verifique se o arquivo não está corrompido.")
  }

  const storagePath = buildStoragePath(productId.data, "image/webp", randomUUID())
  const upload = await putObject(storagePath, optimized, "image/webp")
  if (!upload.ok) {
    console.error("[images] upload R2:", upload.error)
    return failure("Falha ao enviar a imagem para o armazenamento. Tente novamente.")
  }
  return success({ storagePath })
}
