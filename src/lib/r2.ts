import "server-only"

import { AwsClient } from "aws4fetch"
import { z } from "zod"
import { getImagesBaseUrl, type EnvIssue } from "@/lib/env"
import { MAX_PRESIGN_SECONDS, presignGetUrl, startOfDayAmzDate } from "@/lib/presign"

/**
 * Armazenamento das imagens no Cloudflare R2 (API compatível com S3).
 *
 * As credenciais são lidas apenas no servidor (sem prefixo NEXT_PUBLIC_).
 * O token deve ter permissão "Object Read & Write" restrita ao bucket.
 */

type R2Env =
  | { ok: true; host: string; bucket: string; endpoint: string; client: AwsClient; accessKeyId: string; secretAccessKey: string }
  | { ok: false; issues: EnvIssue[] }

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const

const valueSchema = z.string().trim().min(1)

let cached: R2Env | null = null

function getR2Env(): R2Env {
  if (cached) return cached

  const issues: EnvIssue[] = []
  const values: Partial<Record<(typeof R2_VARS)[number], string>> = {}
  for (const name of R2_VARS) {
    const parsed = valueSchema.safeParse(process.env[name] ?? "")
    if (parsed.success) values[name] = parsed.data
    else issues.push({ name, problem: "ausente" })
  }
  // Não guarda em cache enquanto houver pendências: permite corrigir o .env sem reiniciar o processo.
  if (issues.length > 0) return { ok: false, issues }

  const host = `${values.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  cached = {
    ok: true,
    host,
    bucket: values.R2_BUCKET!,
    endpoint: `https://${host}/${values.R2_BUCKET}`,
    accessKeyId: values.R2_ACCESS_KEY_ID!,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
    client: new AwsClient({
      accessKeyId: values.R2_ACCESS_KEY_ID!,
      secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    }),
  }
  return cached
}

/** true quando as chaves R2_* estão configuradas: com elas dá para enviar e exibir (URL assinada) as imagens. */
export function isImageStorageConfigured() {
  return getR2Env().ok
}

/**
 * URL para exibir uma imagem. Com NEXT_PUBLIC_IMAGES_BASE_URL (bucket público ou domínio próprio), usa o
 * endereço fixo; sem ela, o bucket fica privado e a URL é assinada por 7 dias, sempre com a data do início
 * do dia, para não mudar ao longo do dia. As páginas em cache duram no máximo 1 dia, então o link
 * entregue nunca está vencido. Retorna null se nada estiver configurado.
 */
export function getProductImageUrl(storagePath: string) {
  const baseUrl = getImagesBaseUrl()
  if (baseUrl) return `${baseUrl}/${storagePath.split("/").map(encodeURIComponent).join("/")}`

  const env = getR2Env()
  if (!env.ok) return null
  return presignGetUrl({
    host: env.host,
    path: `/${env.bucket}/${storagePath}`,
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    region: "auto",
    amzDate: startOfDayAmzDate(),
    expiresSeconds: MAX_PRESIGN_SECONDS,
  })
}

export type R2Result = { ok: true } | { ok: false; error: string }

function objectUrl(endpoint: string, key: string) {
  return `${endpoint}/${key.split("/").map(encodeURIComponent).join("/")}`
}

function missingConfig(issues: EnvIssue[]): R2Result {
  return { ok: false, error: `Armazenamento de imagens não configurado: ${issues.map((i) => i.name).join(", ")}.` }
}

/** Envia um objeto. Os arquivos são imutáveis (nome único), por isso o cache é de 1 ano. */
export async function putObject(key: string, body: Uint8Array<ArrayBuffer>, contentType: string): Promise<R2Result> {
  const env = getR2Env()
  if (!env.ok) return missingConfig(env.issues)

  try {
    const response = await env.client.fetch(objectUrl(env.endpoint, key), {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
    if (!response.ok) return { ok: false, error: `R2 respondeu ${response.status}.` }
    return { ok: true }
  } catch {
    return { ok: false, error: "Não foi possível conectar ao R2." }
  }
}

/** Lê um objeto do bucket (usado pela rota pública /img, de endereço fixo). Retorna null se não existir. */
export async function getObject(key: string): Promise<Response | null> {
  const env = getR2Env()
  if (!env.ok) return null
  try {
    const response = await env.client.fetch(objectUrl(env.endpoint, key))
    return response.ok ? response : null
  } catch {
    return null
  }
}

/** Remove objetos. Chaves inexistentes não são erro (o R2 responde 204). */
export async function deleteObjects(keys: string[]): Promise<R2Result> {
  if (keys.length === 0) return { ok: true }
  const env = getR2Env()
  if (!env.ok) return missingConfig(env.issues)

  try {
    const responses = await Promise.all(
      keys.map((key) => env.client.fetch(objectUrl(env.endpoint, key), { method: "DELETE" })),
    )
    const failed = responses.find((response) => !response.ok && response.status !== 404)
    return failed ? { ok: false, error: `R2 respondeu ${failed.status}.` } : { ok: true }
  } catch {
    return { ok: false, error: "Não foi possível conectar ao R2." }
  }
}
