import { getImagesBaseUrl } from "@/lib/env"

/** Tamanho máximo aceito pelo servidor por arquivo, antes da conversão para WebP. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_IMAGES_PER_PRODUCT = 10

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES

export function isAllowedImageType(type: string): type is AllowedImageType {
  return Object.hasOwn(ALLOWED_IMAGE_TYPES, type)
}

/**
 * Identifica o tipo real da imagem pelos primeiros bytes do arquivo,
 * sem confiar no nome ou no tipo informado pelo navegador.
 */
export function detectImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((byte, i) => bytes[i] === byte)) {
    return "image/png"
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp"
  }
  return null
}

const STORAGE_PATH_PATTERN = /^products\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/

export function isValidStoragePath(path: string, productId: string) {
  return STORAGE_PATH_PATTERN.test(path) && path.startsWith(`products/${productId}/`)
}

/** Caminho seguro, gerado no servidor: products/<produto>/<timestamp>-<aleatório>.<ext> */
export function buildStoragePath(productId: string, type: AllowedImageType, random: string, now = Date.now()) {
  const safeRandom = random.replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase()
  return `products/${productId}/${now}-${safeRandom}.${ALLOWED_IMAGE_TYPES[type]}`
}

/** URL pública do arquivo no R2. Retorna null se NEXT_PUBLIC_IMAGES_BASE_URL não estiver configurada. */
export function getProductImageUrl(storagePath: string) {
  const baseUrl = getImagesBaseUrl()
  if (!baseUrl) return null
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/")
  return `${baseUrl}/${encoded}`
}
