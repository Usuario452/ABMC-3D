import { getProductImageUrl } from "@/lib/images"
import type { ProductImage } from "@/types/catalog"

export type RawImage = { id: string; storage_path: string; alt_text: string; position: number }

export function mapImage(image: RawImage): ProductImage {
  return {
    id: image.id,
    storagePath: image.storage_path,
    url: getProductImageUrl(image.storage_path),
    altText: image.alt_text,
    position: image.position,
  }
}

/** Escapa os curingas do ILIKE para buscar o texto literal digitado. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
