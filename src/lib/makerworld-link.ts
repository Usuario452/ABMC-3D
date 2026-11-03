/**
 * Leitura do link de um modelo do MakerWorld. Fica fora de `makerworld.ts` (só do servidor) para o
 * painel também limpar o link ao colar.
 */

/** Hosts aceitos: makerworld.com e subdomínios (www.). */
const HOST = /^(?:[a-z0-9-]+\.)*makerworld\.com$/i

/**
 * Extrai o ID do modelo, ignorando idioma, slug, parâmetros e âncora.
 * Ex.: https://makerworld.com/en/models/1031570-under-sink-trash-bag-holder#profileId-1014459 → "1031570".
 * Aceita o link sem "https://".
 */
export function parseMakerWorldId(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
  if (!HOST.test(url.hostname)) return null
  return url.pathname.match(/\/models\/(\d{1,12})(?:[-/]|$)/)?.[1] ?? null
}

/**
 * Se a licença do modelo permite vender as impressões: `true`, `false` ou `null` (desconhecida).
 * - Creative Commons com "NC" (não comercial) e a Standard Digital File License do MakerWorld (uso
 *   pessoal) não permitem.
 * - As demais Creative Commons (BY, BY-SA, BY-ND) e CC0 permitem, dando crédito ao autor quando há "BY".
 * Licenças comerciais compradas à parte do criador não aparecem aqui.
 */
export function licenseAllowsSale(license: string | null): boolean | null {
  const code = license?.trim().toUpperCase().replace(/^CC[\s-]*/, "") ?? ""
  if (!code) return null
  if (/STANDARD DIGITAL FILE|\bSDFL\b/.test(code)) return false
  if (/\bNC\b/.test(code)) return false
  if (/^(BY(-SA|-ND)?|0|ZERO|PUBLIC DOMAIN)$/.test(code)) return true
  return null
}

/** Nome legível da licença: os códigos Creative Commons ganham o prefixo "CC" (ex.: "BY-NC" → "CC BY-NC"). */
export function licenseLabel(license: string | null) {
  const value = license?.trim()
  if (!value) return null
  return /^(BY|0$)/i.test(value) ? `CC ${value.toUpperCase()}` : value
}

/** Link limpo do modelo: só domínio e ID. */
export function makerWorldModelUrl(id: string) {
  return `https://makerworld.com/en/models/${id}`
}
