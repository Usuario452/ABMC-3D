import "server-only"
import { DEFAULT_MAKERWORLD_LANG, makerWorldModelUrl } from "@/lib/makerworld-link"

/**
 * Importação de modelos do MakerWorld a partir do link da página.
 *
 * A página do modelo fica atrás da verificação anti-robô da Cloudflare (e ela não é contornada);
 * os dados vêm do endpoint JSON que o próprio site usa. Não é uma API pública documentada:
 * se mudar ou for bloqueado, a importação falha com uma mensagem e o cadastro segue manual.
 */

const API = "https://makerworld.com/api/v1/design-service/design"
/** Único host de onde as fotos podem ser baixadas (evita usar a rota de fotos como proxy aberto). */
export const MAKERWORLD_IMAGE_HOST = "makerworld.bblmw.com"
const TIMEOUT_MS = 15_000

export type MakerWorldModel = {
  name: string
  description: string
  images: string[]
  license: string | null
  url: string
}

export { parseMakerWorldId, parseMakerWorldLang } from "@/lib/makerworld-link"

export function isMakerWorldImage(input: string) {
  try {
    const url = new URL(input)
    return url.protocol === "https:" && url.hostname === MAKERWORLD_IMAGE_HOST
  } catch {
    return false
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(value) ? String.fromCodePoint(value) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

/** Converte o HTML simples da descrição (títulos, parágrafos, listas, negrito, links) em Markdown. */
export function htmlToMarkdown(html: string) {
  const markdown = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n\n## $1\n\n")
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "_$2_")
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
  return decodeEntities(markdown)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type ApiPicture = { url?: string }
type ApiResponse = {
  title?: string
  summary?: string
  /** Tradução para o idioma pedido (Accept-Language), quando o MakerWorld tem; vazia quando não tem. */
  titleTranslated?: string
  summaryTranslated?: string
  license?: string
  coverUrl?: string
  designExtension?: { design_pictures?: ApiPicture[] }
  instances?: { pictures?: ApiPicture[] }[]
}

/** Resultado da consulta: o modelo, "não encontrado" ou "bloqueado" (verificação anti-robô da Cloudflare). */
export type MakerWorldLookup = { ok: true; model: MakerWorldModel } | { ok: false; reason: "not_found" | "blocked" }

/** Pausas antes de cada nova tentativa quando o MakerWorld bloqueia ou a conexão falha. */
const RETRY_DELAYS_MS = [1_200, 2_500]
/** Modelos já consultados ficam guardados por um tempo: reabrir o mesmo link não consulta de novo. */
const CACHE_MS = 10 * 60_000
const cache = new Map<string, { at: number; data: ApiResponse }>()

type ApiLookup = { ok: true; data: ApiResponse } | { ok: false; reason: "not_found" | "blocked" }

/** Accept-Language para o idioma do link: português primeiro, inglês como reserva. */
function acceptLanguage(lang: string) {
  return lang.startsWith("pt") ? "pt-BR,pt;q=0.9,en;q=0.8" : `${lang},en;q=0.8`
}

async function requestModel(id: string, lang: string): Promise<ApiLookup> {
  const response = await fetch(`${API}/${id}`, {
    headers: {
      Accept: "application/json",
      // Pede o idioma do link (português por padrão): o MakerWorld devolve título e descrição
      // traduzidos quando tem a tradução.
      "Accept-Language": acceptLanguage(lang),
      "User-Agent": "Mozilla/5.0 (KuboStudio catalog import)",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  // A Cloudflare às vezes responde com uma verificação anti-robô em vez dos dados. Ela não é contornada.
  if (response.headers.get("cf-mitigated") === "challenge" || response.status === 403 || response.status === 429) {
    return { ok: false, reason: "blocked" }
  }
  if (!response.ok) return { ok: false, reason: "not_found" }
  const data = (await response.json()) as ApiResponse
  return data.title ? { ok: true, data } : { ok: false, reason: "not_found" }
}

/**
 * Consulta o modelo, repetindo com pausas crescentes quando há bloqueio ou falha de conexão: o bloqueio
 * costuma ser passageiro, e é o mesmo que o usuário faria clicando de novo, só que sem ele precisar.
 */
async function loadModel(id: string, lang: string): Promise<ApiLookup> {
  const key = `${lang}:${id}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_MS) return { ok: true, data: cached.data }

  for (let attempt = 0; ; attempt++) {
    let result: ApiLookup | null = null
    try {
      result = await requestModel(id, lang)
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) throw error
    }
    if (result?.ok) {
      // Mantém só os mais recentes.
      if (cache.size >= 50) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: Date.now(), data: result.data })
      return result
    }
    if (result?.reason === "not_found" || attempt >= RETRY_DELAYS_MS.length) return result ?? { ok: false, reason: "blocked" }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
  }
}

export async function fetchMakerWorldModel(
  id: string,
  maxImages: number,
  lang: string = DEFAULT_MAKERWORLD_LANG,
): Promise<MakerWorldLookup> {
  const lookup = await loadModel(id, lang)
  if (!lookup.ok) return lookup
  const data = lookup.data
  if (!data.title) return { ok: false, reason: "not_found" }

  // Fotos do modelo primeiro; depois as das variações; sem repetir e só do host permitido.
  const candidates = [
    data.coverUrl,
    ...(data.designExtension?.design_pictures ?? []).map((picture) => picture.url),
    ...(data.instances ?? []).flatMap((instance) => (instance.pictures ?? []).map((picture) => picture.url)),
  ]
  const images = [...new Set(candidates.filter((url): url is string => Boolean(url && isMakerWorldImage(url))))]

  // Em português quando o MakerWorld tem a tradução; senão, o texto original do modelo.
  const name = (data.titleTranslated?.trim() || data.title).trim().slice(0, 120)
  const summary = data.summaryTranslated?.trim() || data.summary || ""
  // A descrição costuma abrir com o próprio nome como título; na loja o nome já aparece acima.
  const description = htmlToMarkdown(summary).replace(/^##\s+(.+)\n*/, (heading, title: string) =>
    title.trim().toLowerCase() === name.toLowerCase() ? "" : heading,
  )

  return {
    ok: true,
    model: {
      name,
      description: description.slice(0, 5000),
      images: images.slice(0, maxImages),
      license: data.license?.trim() || null,
      url: makerWorldModelUrl(id, lang),
    },
  }
}

/**
 * Baixa uma foto do CDN do MakerWorld (só do host permitido), até `maxBytes`. Retorna null se falhar.
 * O tipo é conferido depois pelos bytes: o CDN às vezes responde "application/octet-stream".
 */
export async function fetchMakerWorldImage(url: string, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!isMakerWorldImage(url)) return null
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" })
    if (!response.ok || Number(response.headers.get("content-length") ?? 0) > maxBytes) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return bytes.byteLength > maxBytes ? null : bytes
  } catch {
    return null
  }
}
