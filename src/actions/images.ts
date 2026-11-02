"use server"

import { randomUUID } from "node:crypto"
import { authorizeAdminAction } from "@/lib/auth/admin"
import { describeDbError, failure, success, type ActionResult } from "@/lib/actions/result"
import { catalogChanged } from "@/lib/actions/revalidate"
import { mapImage, type RawImage } from "@/lib/data/mappers"
import { pgErrorCode } from "@/lib/db"
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, buildStoragePath, detectImageType } from "@/lib/images"
import { optimizeProductImage } from "@/lib/image-optimize"
import { deleteObjects, putObject } from "@/lib/r2"
import { imageAltSchema, reorderImagesSchema, uuidSchema } from "@/lib/validation/schemas"
import type { ProductImage } from "@/types/catalog"

const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)

export async function uploadProductImage(formData: FormData): Promise<ActionResult<ProductImage>> {
  const auth = await authorizeAdminAction()
  if (!auth.ok) return auth

  const productId = uuidSchema.safeParse(formData.get("productId"))
  if (!productId.success) return failure("Produto inválido.")

  const altText = imageAltSchema.safeParse(formData.get("altText") ?? "")
  if (!altText.success) return failure(altText.error.issues[0]?.message ?? "Texto alternativo inválido.")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return failure("Selecione um arquivo de imagem.")
  if (file.size > MAX_IMAGE_BYTES) return failure(`A imagem deve ter no máximo ${MAX_MB} MB.`)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!detectImageType(bytes)) return failure("Formato não suportado. Envie imagens JPEG, PNG ou WebP.")

  let images: { position: number }[]
  try {
    const [product] = await auth.sql`select id from products where id = ${productId.data}`
    if (!product) return failure("Produto não encontrado.")
    images = await auth.sql<{ position: number }[]>`
      select position from product_images where product_id = ${productId.data}
    `
  } catch (error) {
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }
  if (images.length >= MAX_IMAGES_PER_PRODUCT) {
    return failure(`Cada produto pode ter no máximo ${MAX_IMAGES_PER_PRODUCT} imagens.`)
  }

  const nextPosition = images.reduce((max, image) => Math.max(max, image.position + 1), 0)

  // Toda imagem é armazenada como WebP otimizado, qualquer que seja o formato enviado.
  let optimized: Uint8Array<ArrayBuffer>
  try {
    optimized = (await optimizeProductImage(bytes)).bytes
  } catch {
    return failure("Não foi possível processar a imagem. Verifique se o arquivo não está corrompido.")
  }

  // Nome de arquivo gerado no servidor: o nome original nunca é usado.
  const storagePath = buildStoragePath(productId.data, "image/webp", randomUUID())

  const upload = await putObject(storagePath, optimized, "image/webp")
  if (!upload.ok) {
    console.error("[images] upload R2:", upload.error)
    return failure("Falha ao enviar a imagem para o armazenamento. Tente novamente.")
  }

  let image: RawImage
  try {
    ;[image] = await auth.sql<RawImage[]>`
      insert into product_images (product_id, storage_path, alt_text, position)
      values (${productId.data}, ${storagePath}, ${altText.data}, ${nextPosition})
      returning id, storage_path, alt_text, position
    `
  } catch (error) {
    // Desfaz o upload para não deixar arquivo sem registro.
    await deleteObjects([storagePath])
    return failure(describeDbError({ code: pgErrorCode(error) }))
  }

  catalogChanged()
  return success(mapImage(image), "Imagem enviada.")
}

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
