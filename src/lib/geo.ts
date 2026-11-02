export type Geo = { country: string | null; region: string | null; city: string | null }

const clean = (value: string | null, max: number) => {
  const text = value?.trim()
  return text ? text.slice(0, max) : null
}

/**
 * Região do visitante a partir dos cabeçalhos da hospedagem (Vercel ou Cloudflare). O IP não é lido nem
 * guardado. Em desenvolvimento local os cabeçalhos não existem e a região fica em branco.
 */
export function readGeo(headers: Headers): Geo {
  const country = clean(headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"), 2)?.toUpperCase() ?? null
  let city = headers.get("x-vercel-ip-city")
  try {
    city = city ? decodeURIComponent(city) : null
  } catch {
    // Cidade em formato inesperado: mantém o texto como veio.
  }
  return {
    country: country && country !== "XX" && country !== "T1" ? country : null,
    region: clean(headers.get("x-vercel-ip-country-region"), 10),
    city: clean(city, 80),
  }
}
