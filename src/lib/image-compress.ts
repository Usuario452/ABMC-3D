import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, isAllowedImageType } from "@/lib/images"

/**
 * Lado maior máximo enviado ao servidor. Fica acima do tamanho armazenado (1600 px)
 * para que o servidor faça a redução final com qualidade.
 */
const MAX_DIMENSION = 2400
/** Qualidade alta: aqui só se reduz o tamanho do envio; a compressão final é feita no servidor. */
const WEBP_QUALITY = 0.95
/** Arquivos originais acima deste tamanho são recomprimidos para caber no limite de envio. */
const RECOMPRESS_ABOVE_BYTES = 2 * 1024 * 1024

export type PreparedImage = { ok: true; file: File } | { ok: false; error: string }

/**
 * Valida e reduz a imagem no navegador antes do envio (no máximo 2400 px), para
 * agilizar o upload. O servidor valida tudo novamente e gera o WebP final.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!isAllowedImageType(file.type)) {
    return { ok: false, error: `${file.name}: formato não suportado. Use JPEG, PNG ou WebP.` }
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: `${file.name}: arquivo muito grande (máximo de 20 MB antes da otimização).` }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const needsResize = scale < 1

    if (!needsResize && file.size <= RECOMPRESS_ABOVE_BYTES) {
      bitmap.close()
      return { ok: true, file }
    }

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas indisponível")
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY))
    if (blob && blob.type === "image/webp" && blob.size < file.size) {
      const name = file.name.replace(/\.[^.]+$/, "") + `.${ALLOWED_IMAGE_TYPES["image/webp"]}`
      return checkSize(new File([blob], name, { type: "image/webp" }))
    }
  } catch {
    // Se a otimização falhar, tenta enviar o arquivo original.
  }

  return checkSize(file)
}

function checkSize(file: File): PreparedImage {
  if (file.size > MAX_IMAGE_BYTES) {
    const maxMb = Math.round(MAX_IMAGE_BYTES / 1024 / 1024)
    return { ok: false, error: `${file.name}: a imagem deve ter no máximo ${maxMb} MB.` }
  }
  return { ok: true, file }
}
