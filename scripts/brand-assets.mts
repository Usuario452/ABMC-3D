/**
 * Gera o kit de marca em public/brand/ a partir do logo original (kubostudio-logo.png, fundo preto):
 *
 *   kubostudio-logo-light.png        logo completo, fundo transparente, texto branco (para fundos escuros)
 *   kubostudio-logo-dark.png         logo completo, fundo transparente, texto escuro (para fundos claros)
 *   kubostudio-icon.png              só o símbolo, 1:1 (1024 × 1024), fundo transparente
 *   kubostudio-icon-on-dark.png      só o símbolo, 1:1, sobre o preto da marca (avatares e redes sociais)
 *
 *   npm run brand:build
 *
 * O arquivo original nunca é alterado. A transparência é calculada pelo brilho de cada pixel:
 * o texto é branco puro sobre preto (alpha exato); o símbolo dourado recebe de volta a cor
 * "limpa" nas bordas, sem contorno escuro em fundos claros.
 */
import { join } from "node:path"
import sharp from "sharp"

const BRAND_DIR = join(import.meta.dirname, "..", "public", "brand")
const SOURCE = join(BRAND_DIR, "kubostudio-logo.png")

const TEXT_LIGHT = [255, 255, 255] as const
const TEXT_DARK = [10, 10, 10] as const
const BRAND_BACKGROUND = "#080808"

const ICON_SIZE = 1024
/** Parte da altura do quadrado ocupada pelo símbolo (o restante é respiro). */
const ICON_FILL = 0.68
const LOGO_PADDING = 48

const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = info

/** Canal mais forte de cada pixel: sobre fundo preto, é proporcional à opacidade da tinta. */
const level = new Uint8Array(width * height)
for (let i = 0; i < level.length; i++) {
  level[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])
}

// O símbolo e o texto ocupam faixas de colunas separadas. O próprio "K" tem uma fresta
// estreita no meio, então a divisão é o primeiro vazio largo (mais de 30 colunas).
const MIN_GAP = 30
const occupied = Array.from({ length: width }, (_, x) => {
  for (let y = 0; y < height; y++) if (level[y * width + x] > 60) return true
  return false
})
let splitX = -1
for (let x = occupied.indexOf(true), gapStart = -1; x < width; x++) {
  if (!occupied[x]) {
    if (gapStart < 0) gapStart = x
    continue
  }
  if (gapStart >= 0 && x - gapStart > MIN_GAP) {
    splitX = Math.round((gapStart + x) / 2)
    break
  }
  gapStart = -1
}
if (splitX < 0) throw new Error("Não foi possível separar o símbolo do texto no logo original.")

const TEXT_NOISE_FLOOR = 16
const SOLID = 64
const FADE_FROM = 18
/** Largura da faixa de borda do símbolo (px) em que a cor é refeita a partir do interior. */
const EDGE_BAND = 2
const REFERENCE_RADIUS = 7

/** Distância (Chebyshev) de cada pixel do símbolo até o fundo, saturada em 255. */
function distanceToBackground() {
  const dist = new Uint8Array(width * height)
  for (let p = 0; p < dist.length; p++) {
    const x = p % width
    dist[p] = x < splitX && level[p] >= SOLID ? 255 : 0
  }
  const relax = (x: number, y: number, dx: number, dy: number) => {
    const nx = x + dx
    const ny = y + dy
    const p = y * width + x
    const near = nx < 0 || ny < 0 || nx >= width || ny >= height ? 0 : dist[ny * width + nx]
    if (near + 1 < dist[p]) dist[p] = near + 1
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < splitX; x++) {
      for (const [dx, dy] of [[-1, 0], [-1, -1], [0, -1], [1, -1]]) relax(x, y, dx, dy)
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = splitX - 1; x >= 0; x--) {
      for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1]]) relax(x, y, dx, dy)
    }
  }
  return dist
}

/**
 * RGBA do símbolo. No miolo, usa a cor original. Na borda, os pixels originais estão misturados com
 * o preto: em vez de aproveitar essa cor escura (que viraria um contorno em fundos claros), a cor é
 * refeita a partir do interior mais próximo e a opacidade é a fração de brilho em relação a ele.
 */
function buildIcon() {
  const dist = distanceToBackground()
  const rgba = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < splitX; x++) {
      const p = y * width + x
      const out = p * 4
      const strength = level[p]
      if (strength < FADE_FROM) continue

      let [r, g, b, alpha] = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2], 255]
      if (dist[p] <= EDGE_BAND) {
        let sumR = 0
        let sumG = 0
        let sumB = 0
        let count = 0
        for (let dy = -REFERENCE_RADIUS; dy <= REFERENCE_RADIUS; dy++) {
          for (let dx = -REFERENCE_RADIUS; dx <= REFERENCE_RADIUS; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= splitX || ny >= height) continue
            const q = ny * width + nx
            if (dist[q] <= EDGE_BAND) continue
            sumR += data[q * 3]
            sumG += data[q * 3 + 1]
            sumB += data[q * 3 + 2]
            count++
          }
        }
        if (count > 0) {
          r = sumR / count
          g = sumG / count
          b = sumB / count
          alpha = Math.round(Math.min(1, strength / Math.max(r, g, b)) * 255)
        }
      }
      rgba[out] = r
      rgba[out + 1] = g
      rgba[out + 2] = b
      rgba[out + 3] = alpha
    }
  }
  return rgba
}

const iconPixels = buildIcon()

/** Monta o PNG RGBA do logo completo com a cor de texto escolhida. */
function buildLogo(textColor: readonly [number, number, number]) {
  const rgba = Buffer.alloc(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const out = p * 4

      if (x < splitX) {
        rgba.set(iconPixels.subarray(out, out + 4), out)
        continue
      }

      // Texto: tinta branca sobre preto, então a opacidade é o brilho. O piso descarta o ruído de
      // compressão do fundo do arquivo original, que apareceria como "fantasma" em fundos claros.
      const strength = level[p]
      if (strength <= TEXT_NOISE_FLOOR) continue
      rgba[out] = textColor[0]
      rgba[out + 1] = textColor[1]
      rgba[out + 2] = textColor[2]
      rgba[out + 3] = Math.round(((strength - TEXT_NOISE_FLOOR) / (255 - TEXT_NOISE_FLOOR)) * 255)
    }
  }
  return rgba
}

type Box = { left: number; top: number; width: number; height: number }

/** Menor retângulo que contém a tinta (alpha visível) dentro das colunas [fromX, toX). */
function inkBox(rgba: Buffer, fromX: number, toX: number): Box {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = fromX; x < toX; x++) {
      if (rgba[(y * width + x) * 4 + 3] < 24) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

const clear = { r: 0, g: 0, b: 0, alpha: 0 }
const raw = { raw: { width, height, channels: 4 as const } }

async function writeLogo(file: string, rgba: Buffer, box: Box) {
  await sharp(rgba, raw)
    .extract(box)
    .extend({ top: LOGO_PADDING, bottom: LOGO_PADDING, left: LOGO_PADDING, right: LOGO_PADDING, background: clear })
    .png({ compressionLevel: 9 })
    .toFile(join(BRAND_DIR, file))
  console.log(`${file} (${box.width + LOGO_PADDING * 2} × ${box.height + LOGO_PADDING * 2})`)
}

async function writeIcons(rgba: Buffer) {
  const box = inkBox(rgba, 0, splitX)
  const targetHeight = Math.round(ICON_SIZE * ICON_FILL)
  const targetWidth = Math.round((box.width / box.height) * targetHeight)
  const left = Math.round((ICON_SIZE - targetWidth) / 2)
  const top = Math.round((ICON_SIZE - targetHeight) / 2)

  const square = await sharp(rgba, raw)
    .extract(box)
    .resize({ width: targetWidth, height: targetHeight, kernel: "lanczos3" })
    .extend({
      top,
      bottom: ICON_SIZE - targetHeight - top,
      left,
      right: ICON_SIZE - targetWidth - left,
      background: clear,
    })
    .png({ compressionLevel: 9 })
    .toBuffer()

  await sharp(square).toFile(join(BRAND_DIR, "kubostudio-icon.png"))
  await sharp(square)
    .flatten({ background: BRAND_BACKGROUND })
    .png({ compressionLevel: 9 })
    .toFile(join(BRAND_DIR, "kubostudio-icon-on-dark.png"))
  console.log(`kubostudio-icon.png e kubostudio-icon-on-dark.png (${ICON_SIZE} × ${ICON_SIZE})`)
}

const light = buildLogo(TEXT_LIGHT)
const dark = buildLogo(TEXT_DARK)
const fullBox = inkBox(light, 0, width)

console.log(`Origem: ${width} × ${height}; símbolo até x=${splitX}, texto a partir daí`)
await writeLogo("kubostudio-logo-light.png", light, fullBox)
await writeLogo("kubostudio-logo-dark.png", dark, fullBox)
await writeIcons(light)
