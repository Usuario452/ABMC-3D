"use server"

import { randomUUID } from "node:crypto"
import { authorizeAdminAction } from "@/lib/auth/admin"
import { describeDbError, failure, success, type ActionResult } from "@/lib/actions/result"
import { catalogChanged } from "@/lib/actions/revalidate"
import { mapImage, type RawImage } from "@/lib/data/mappers"
import { pgErrorCode } from "@/lib/db"
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, buildStoragePath, detectImageType, isValidStoragePath } from "@/lib/images"
import { fetchMakerWorldImage } from "@/lib/makerworld"
import { optimizeProductImage } from "@/lib/image-optimize"
import { deleteObjects, putObject } from "@/lib/r2"
import { imageAltSchema, reorderImagesSchema, uuidSchema } from "@/lib/validation/schemas"
import type { ProductImage } from "@/types/catalog"

const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)

export async function updateImageAlt(imageId: string, altText: string): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const id = uuidSchema.safeParse(imageId)
  const alt = imageAltSchema.safeParse(altText)
  if (!id.success) return failure("Imagem inválida.")
  if (!alt.success) return failure(alt.error.issues[0]?.message ?? "Texto alternativo inválido.")

  try {
    const rows = await auth.sql`update product_images set alt_text = ${alt.data} where id = ${id.data} returning id`
    if (rows.length === 0) return failure("Imagem não encontrada.")
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  catalogChanged()
  return success(null, "Texto alternativo salvo.")
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const parsed = reorderImagesSchema.safeParse({ productId, imageIds })
  if (!parsed.success) return failure("Ordem de imagens inválida.")

  try {
    await auth.sql`select reorder_product_images(${parsed.data.productId}, ${parsed.data.imageIds}::uuid[])`
  } catch (error) {
    const code = pgErrorCode(error)
    return failure(
      code === "22023" ? "As imagens foram alteradas em outra aba. Recarregue a página." : describeDbError({ code }),
    )
  }

  catalogChanged()
  return success(null, "Ordem das imagens atualizada.")
}

export async function deleteProductImage(imageId: string): Promise<ActionResult> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const id = uuidSchema.safeParse(imageId)
  if (!id.success) return failure("Imagem inválida.")

  let storagePath: string | null
  try {
    // Remove o registro e normaliza as posições restantes (0, 1, 2…) na mesma transação.
    storagePath = await auth.sql.begin(async (tx) => {
      const [image] = await tx<{ product_id: string; storage_path: string }[]>`
        delete from product_images where id = ${id.data} returning product_id, storage_path
      `
      if (!image) return null
      await tx`
        update product_images i
        set position = ranked.ord - 1
        from (
          select id, row_number() over (order by position) as ord
          from product_images
          where product_id = ${image.product_id}
        ) ranked
        where i.id = ranked.id
      `
      return image.storage_path
    })
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }
  if (storagePath === null) return failure("Imagem não encontrada.")

  catalogChanged()

  // O registro sai antes do arquivo: uma falha no R2 deixa no máximo um arquivo órfão.
  const removal = await deleteObjects([storagePath])
  if (!removal.ok) {
    console.error("[images] remoção R2:", removal.error)
    return success(null, "Imagem removida do produto, mas o arquivo não pôde ser apagado do armazenamento.")
  }

  return success(null, "Imagem removida.")
}

/**
 * Processa uma foto e grava no R2, sem registrar no banco: vários envios rodam ao mesmo tempo e
 * registerProductImages grava todos de uma vez, na ordem. A foto vem do computador (`file`) ou é um
 * link do MakerWorld (`url`), baixado aqui no servidor, sem passar pelo navegador.
 */
export async function storeProductImage(formData: FormData): Promise<ActionResult<{ storagePath: string }>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

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

/**
 * Registra no banco, numa só vez e na ordem recebida, as fotos já gravadas por storeProductImage.
 * Os arquivos de quem não couber (limite de fotos) ou de um erro são apagados do R2.
 */
export async function registerProductImages(
  productId: string,
  storagePaths: string[],
  altText: string,
): Promise<ActionResult<ProductImage[]>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const id = uuidSchema.safeParse(productId)
  const alt = imageAltSchema.safeParse(altText)
  const paths = Array.isArray(storagePaths) ? storagePaths.filter((path) => typeof path === "string") : []
  if (!id.success || paths.length === 0 || paths.length > MAX_IMAGES_PER_PRODUCT) return failure("Fotos inválidas.")
  // Só caminhos deste produto, gerados pelo servidor.
  if (!paths.every((path) => isValidStoragePath(path, id.data))) return failure("Fotos inválidas.")

  let images: RawImage[]
  try {
    images = await auth.sql.begin(async (tx) => {
      const [product] = await tx`select id from products where id = ${id.data} for update`
      if (!product) return []
      const existing = await tx<{ position: number }[]>`select position from product_images where product_id = ${id.data}`
      const room = Math.max(MAX_IMAGES_PER_PRODUCT - existing.length, 0)
      const accepted = paths.slice(0, room)
      if (accepted.length === 0) return []
      const start = existing.reduce((max, image) => Math.max(max, image.position + 1), 0)
      const rows = accepted.map((path, index) => ({
        product_id: id.data,
        storage_path: path,
        alt_text: alt.success ? alt.data : "",
        position: start + index,
      }))
      return tx<RawImage[]>`
        insert into product_images ${tx(rows)}
        returning id, storage_path, alt_text, position
      `
    })
  } catch (error) {
    await deleteObjects(paths)
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  const saved = new Set(images.map((image) => image.storage_path))
  const leftover = paths.filter((path) => !saved.has(path))
  if (leftover.length > 0) await deleteObjects(leftover)
  if (images.length === 0) return failure("Produto não encontrado ou limite de fotos atingido.")

  catalogChanged()
  return success(images.sort((a, b) => a.position - b.position).map(mapImage))
}
