import sharp from "sharp"

/** Lado maior máximo da imagem armazenada: suficiente para a página do produto em telas retina. */
export const STORED_MAX_DIMENSION = 1600
/** Qualidade WebP: 82 é visualmente indistinguível do original em fotos de produto. */
const WEBP_QUALITY = 82

export type OptimizedImage = { bytes: Uint8Array<ArrayBuffer>; width: number; height: number }

/**
 * Normaliza toda imagem enviada para WebP no servidor: corrige a rotação (EXIF),
 * reduz para no máximo 1600 px sem ampliar, remove metadados (GPS, câmera) e
 * comprime preservando a transparência de PNGs.
 */
export async function optimizeProductImage(input: Uint8Array): Promise<OptimizedImage> {
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: STORED_MAX_DIMENSION,
      height: STORED_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 5, smartSubsample: true })
    .toBuffer({ resolveWithObject: true })

  return { bytes: Uint8Array.from(data), width: info.width, height: info.height }
}
