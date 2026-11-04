import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { STORED_MAX_DIMENSION, optimizeProductImage } from "@/lib/image-optimize"
import { detectImageType } from "@/lib/images"

function noise(width: number, height: number, channels: 3 | 4) {
  const pixels = Buffer.alloc(width * height * channels)
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7919) % 251
  return sharp(pixels, { raw: { width, height, channels } })
}

describe("optimizeProductImage", () => {
  it("converte JPEG grande para WebP de no máximo 1600 px, mantendo a proporção", async () => {
    const jpeg = await noise(3000, 2000, 3).jpeg({ quality: 95 }).toBuffer()
    const result = await optimizeProductImage(new Uint8Array(jpeg))

    expect(detectImageType(result.bytes)).toBe("image/webp")
    expect(result.width).toBe(STORED_MAX_DIMENSION)
    expect(result.height).toBe(1067)
  })

  it("não amplia imagens pequenas e preserva a transparência de PNGs", async () => {
    const png = await noise(400, 300, 4).png().toBuffer()
    const result = await optimizeProductImage(new Uint8Array(png))
    const meta = await sharp(result.bytes).metadata()

    expect(meta.format).toBe("webp")
    expect([meta.width, meta.height]).toEqual([400, 300])
    expect(meta.hasAlpha).toBe(true)
  })

  it("aplica a rotação EXIF e remove os metadados", async () => {
    const rotated = await noise(200, 100, 3).jpeg().withMetadata({ orientation: 6 }).toBuffer()
    const meta = await sharp((await optimizeProductImage(new Uint8Array(rotated))).bytes).metadata()

    expect([meta.width, meta.height]).toEqual([100, 200])
    expect(meta.orientation).toBeUndefined()
    expect(meta.exif).toBeUndefined()
  })

  it("guarda como veio um WebP já pronto (sem recomprimir)", async () => {
    const webp = await noise(800, 600, 3).webp({ quality: 90 }).toBuffer()
    const result = await optimizeProductImage(new Uint8Array(webp))

    expect(Buffer.from(result.bytes).equals(webp)).toBe(true)
    expect([result.width, result.height]).toEqual([800, 600])
  })

  it("recomprime WebP grande demais ou com metadados de câmera", async () => {
    const big = await noise(2400, 1200, 3).webp({ quality: 90 }).toBuffer()
    const resized = await optimizeProductImage(new Uint8Array(big))
    expect(resized.width).toBe(STORED_MAX_DIMENSION)

    const withExif = await noise(300, 200, 3).webp().withMetadata({ orientation: 6 }).toBuffer()
    const cleaned = await sharp((await optimizeProductImage(new Uint8Array(withExif))).bytes).metadata()
    expect([cleaned.width, cleaned.height]).toEqual([200, 300])
    expect(cleaned.exif).toBeUndefined()
  })

  it("rejeita arquivos corrompidos", async () => {
    await expect(optimizeProductImage(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).rejects.toThrow()
  })
})
