import sharp from "sharp"

/** Lado maior máximo da imagem armazenada: suficiente para a página do produto em telas retina. */
export const STORED_MAX_DIMENSION = 1600
/**
 * Qualidade WebP do arquivo guardado. 90 preserva detalhes finos (texto, roscas, textura do filamento),
 * inclusive em fotos que já chegam comprimidas (ex.: importadas do MakerWorld); cada foto fica com ~40–70 KB.
 */
const WEBP_QUALITY = 90

/** Acima deste tamanho, mesmo um WebP pronto é recomprimido (para não guardar arquivos pesados à toa). */
const PASSTHROUGH_MAX_BYTES = 500 * 1024

export type OptimizedImage = { bytes: Uint8Array<ArrayBuffer>; width: number; height: number }

/**
 * Normaliza toda imagem enviada para WebP no servidor: corrige a rotação (EXIF),
 * reduz para no máximo 1600 px sem ampliar, remove metadados (GPS, câmera) e
 * comprime preservando a transparência de PNGs.
 *
 * Para não somar perdas, um WebP que já está pronto (até 1600 px, sem rotação nem metadados de câmera,
 * não animado e leve) é guardado como veio, sem recomprimir. Fotos do MakerWorld costumam chegar assim.
 */
export async function optimizeProductImage(input: Uint8Array): Promise<OptimizedImage> {
  const meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const ready =
    meta.format === "webp" &&
    width > 0 &&
    Math.max(width, height) <= STORED_MAX_DIMENSION &&
    (meta.orientation ?? 1) === 1 &&
    !meta.exif &&
    !meta.xmp &&
    (meta.pages ?? 1) === 1 &&
    input.byteLength <= PASSTHROUGH_MAX_BYTES
  if (ready) return { bytes: Uint8Array.from(input), width, height }

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: STORED_MAX_DIMENSION,
      height: STORED_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    // effort 4 (o padrão) e sem smartSubsample: ~40% mais rápido, sem diferença visível em fotos de produto.
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  return { bytes: Uint8Array.from(data), width: info.width, height: info.height }
}
