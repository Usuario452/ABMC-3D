export type Device = "desktop" | "mobile" | "tablet" | "other"

export type ParsedAgent = { device: Device; browser: string | null; os: string | null; bot: boolean }

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python-requests|axios|node-fetch/i

/** Leitura simples do User-Agent: o suficiente para separar dispositivo, navegador e sistema. */
export function parseUserAgent(ua: string | null | undefined): ParsedAgent {
  if (!ua) return { device: "other", browser: null, os: null, bot: true }

  const tablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const mobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)

  let browser: string | null = null
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = "Edge"
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera"
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet"
  else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox"
  else if (/Chrome|CriOS/.test(ua)) browser = "Chrome"
  else if (/Safari/.test(ua)) browser = "Safari"

  let os: string | null = null
  if (/Windows/.test(ua)) os = "Windows"
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS"
  else if (/Android/.test(ua)) os = "Android"
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS"
  else if (/CrOS/.test(ua)) os = "ChromeOS"
  else if (/Linux/.test(ua)) os = "Linux"

  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", browser, os, bot: BOT.test(ua) }
}
