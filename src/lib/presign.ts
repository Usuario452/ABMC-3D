import { createHash, createHmac } from "node:crypto"

/**
 * URL assinada (AWS Signature V4, assinatura na query) para ler um objeto de um bucket S3/R2 privado.
 * Síncrona de propósito: é chamada ao montar listas de produtos, sem precisar de await.
 */

/** Validade máxima aceita pela assinatura V4: 7 dias. */
export const MAX_PRESIGN_SECONDS = 7 * 24 * 60 * 60

type PresignInput = {
  host: string
  /** Caminho já com o bucket, sem codificar (ex.: "/kubostudio/products/abc/foto.webp"). */
  path: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  /** Momento da assinatura no formato AAAAMMDDTHHMMSSZ. */
  amzDate: string
  expiresSeconds: number
}

/** Codificação exigida pela V4: tudo menos letras, números e -_.~ (inclusive !'()*). */
function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest()

export function presignGetUrl({ host, path, accessKeyId, secretAccessKey, region, amzDate, expiresSeconds }: PresignInput) {
  const dateStamp = amzDate.slice(0, 8)
  const scope = `${dateStamp}/${region}/s3/aws4_request`
  const canonicalPath = path.split("/").map(encodeRfc3986).join("/")

  // Parâmetros em ordem alfabética, como pede a canonicalização.
  const query = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresSeconds)],
    ["X-Amz-SignedHeaders", "host"],
  ]
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .join("&")

  const canonicalRequest = ["GET", canonicalPath, query, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n")
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n")

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"), "aws4_request")
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex")

  return `https://${host}${canonicalPath}?${query}&X-Amz-Signature=${signature}`
}

/**
 * Início do dia (UTC) no formato da assinatura. Assinando sempre com a mesma data no mesmo dia,
 * a URL de cada imagem não muda ao longo do dia e os caches (navegador, next/image) continuam valendo.
 */
export function startOfDayAmzDate(now = new Date()) {
  return `${now.toISOString().slice(0, 10).replaceAll("-", "")}T000000Z`
}
