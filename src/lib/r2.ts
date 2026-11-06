import "server-only"

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
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
  | { ok: true; host: string; bucket: string; endpoint: string; client: S3Client; accessKeyId: string; secretAccessKey: string }
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
    endpoint: `https://${host}`,
    accessKeyId: values.R2_ACCESS_KEY_ID!,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
    client: new S3Client({
      endpoint: `https://${host}`,
      region: "auto",
      forcePathStyle: true,
      credentials: { accessKeyId: values.R2_ACCESS_KEY_ID!, secretAccessKey: values.R2_SECRET_ACCESS_KEY! },
      // PutObject não exige checksum opcional: evita CRC/trailers automáticos em APIs S3 compatíveis.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      maxAttempts: 3,
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 20_000 },
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

function missingConfig(issues: EnvIssue[]): R2Result {
  return { ok: false, error: `Armazenamento de imagens não configurado: ${issues.map((i) => i.name).join(", ")}.` }
}

const MAX_ERROR_BODY_BYTES = 8 * 1024
const ERROR_BODY_TIMEOUT_MS = 1000
const S3_ERROR_CODES = new Set([
  "AccessDenied", "Unauthorized", "InvalidAccessKeyId", "SignatureDoesNotMatch",
  "AuthorizationHeaderMalformed", "ExpiredRequest", "RequestTimeTooSkewed",
  "InvalidArgument", "InvalidRequest", "InvalidBucketName", "NoSuchBucket",
  "InvalidObjectName", "EntityTooLarge", "MetadataTooLarge", "MissingContentLength",
  "IncompleteBody", "InvalidDigest", "BadDigest", "MalformedXML",
  "XAmzContentSHA256Mismatch", "NotImplemented", "NotEntitled",
  "InternalError", "ServiceUnavailable", "ClientDisconnect", "TooManyRequests",
])

// Nomes conhecidos, sem espaços ou controles, viram rótulos constantes; cabeçalhos não distinguem caixa.
const S3_ARGUMENT_LABELS = new Map([
  ["Content-Type", "content_type"],
  ["Cache-Control", "cache_control"],
  ["Content-Length", "content_length"],
  ["Authorization", "authorization"],
  ["Credential", "credential"],
  ["AccessKeyId", "access_key_id"],
  ["x-amz-content-sha256", "payload_hash"],
  ["Bucket", "bucket"],
  ["Key", "object_key"],
  ["Content-Encoding", "content_encoding"],
  ["Transfer-Encoding", "transfer_encoding"],
  ["x-amz-checksum-crc32", "checksum_crc32"],
  ["x-amz-checksum-crc32c", "checksum_crc32c"],
  ["x-amz-checksum-sha1", "checksum_sha1"],
  ["x-amz-checksum-sha256", "checksum_sha256"],
  ["x-amz-sdk-checksum-algorithm", "checksum_algorithm"],
  ["x-amz-trailer", "checksum_trailer"],
].map(([name, label]) => [name.toLowerCase(), label]))

/** IDs hexadecimais de 16 ou 32 caracteres; outros formatos são omitidos por segurança. */
function safeRequestId(value: string | null) {
  return value !== null && (value.length === 16 || value.length === 32) && !/[^a-f0-9]/i.test(value)
    ? value
    : undefined
}

/**
 * Reconhece apenas o envelope S3 simples, com campos de texto e sem DTD, entidades
 * externas ou elementos aninhados. XML incompleto/complexo não gera diagnóstico.
 * Nenhum campo livre é devolvido, nem mesmo Message, Resource ou HostId.
 */
function safeS3Fields(xml: string) {
  const envelope = xml.trim().match(
    /^(?:<\?xml\s+[^?<>]*\?>\s*)?<Error(?:\s+xmlns=(?:"[^"<>]*"|'[^'<>]*'))?\s*>([\s\S]*)<\/Error>$/,
  )
  if (!envelope) return {}
  const fields = envelope[1].trim()
  const element = /<([A-Za-z][\w.-]*)>([^<>]*)<\/\1>\s*/y
  let offset = 0
  let code: string | undefined
  let requestId: string | undefined
  let argument: string | undefined
  const seen = new Set<string>()
  while (offset < fields.length) {
    element.lastIndex = offset
    const match = element.exec(fields)
    if (!match || seen.has(match[1])) return {}
    // Não interpreta entidades; rejeita referências malformadas em qualquer campo.
    if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(match[2])) return {}
    seen.add(match[1])
    if (match[1] === "Code" && S3_ERROR_CODES.has(match[2])) code = match[2]
    if (match[1] === "RequestId") requestId = safeRequestId(match[2])
    if (match[1] === "ArgumentName") argument = S3_ARGUMENT_LABELS.get(match[2].toLowerCase())
    offset = element.lastIndex
  }
  return { code, requestId, argument }
}

/** Diagnóstico interno limitado; nunca devolve o corpo ou mensagens livres do R2. */
export async function describeR2HttpError(response: Response): Promise<string> {
  const base = `R2 respondeu ${response.status}.`
  let code: string | undefined
  let argument: string | undefined
  let requestId = safeRequestId(response.headers.get("x-amz-request-id"))
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const deadline = Date.now() + ERROR_BODY_TIMEOUT_MS
  try {
    if (response.body) {
      reader = response.body.getReader()
      const bodyReader = reader
      const readBody = async () => {
        const bytes = new Uint8Array(MAX_ERROR_BODY_BYTES)
        let length = 0
        while (length < MAX_ERROR_BODY_BYTES) {
          if (stopped || Date.now() >= deadline) return null
          const chunk = await bodyReader.read()
          if (stopped || Date.now() >= deadline) return null
          if (chunk.done) return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length))
          // O stream pode entregar um bloco maior que o espaço restante. Nesse caso,
          // descarta o diagnóstico: nunca copia/processa mais de 8.192 bytes.
          if (chunk.value.byteLength > MAX_ERROR_BODY_BYTES - length) return null
          bytes.set(chunk.value, length)
          length += chunk.value.byteLength
        }
        // Não solicita outra leitura para procurar EOF depois de atingir o limite.
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length))
      }
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          stopped = true
          resolve(null)
        }, ERROR_BODY_TIMEOUT_MS)
      })
      const body = await Promise.race([readBody(), timeout])
      if (body !== null) {
        const fields = safeS3Fields(body)
        code = fields.code
        argument = fields.argument
        requestId ??= fields.requestId
      }
    }
  } catch {
    // Falha no diagnóstico não substitui o erro HTTP original nem expõe a exceção.
  } finally {
    stopped = true
    if (timer !== undefined) clearTimeout(timer)
    // Cancelamento não pode bloquear o retorno, falhar nem reativar o leitor.
    try {
      if (reader) void reader.cancel().catch(() => {})
    } catch {
      // Preserva o diagnóstico mesmo se o cancelamento lançar sincronamente.
    }
  }
  return base + (code ? ` Código S3: ${code}.` : "") + (argument ? ` Argumento: ${argument}.` : "") + (requestId ? ` ID da requisição: ${requestId}.` : "")
}

/** Avaliação isolada da resposta: sucesso não abre nem lê o corpo de diagnóstico. */
export async function uploadResponseResult(response: Response): Promise<R2Result> {
  if (!response.ok) return { ok: false, error: await describeR2HttpError(response) }
  return { ok: true }
}

/** Somente status, códigos e rótulos conhecidos; nunca registra o objeto de erro do SDK. */
function sdkFailure(error: unknown): R2Result {
  const generic: R2Result = { ok: false, error: "Não foi possível conectar ao R2." }
  if (!error || typeof error !== "object") return generic
  const detail = error as Record<string, unknown>
  const metadata = detail.$metadata && typeof detail.$metadata === "object"
    ? detail.$metadata as Record<string, unknown> : {}
  const status = metadata.httpStatusCode
  if (typeof status !== "number" || !Number.isInteger(status) || status < 100 || status > 599) return generic
  const code = [detail.name, detail.Code].find((value): value is string => typeof value === "string" && S3_ERROR_CODES.has(value))
  const argument = typeof detail.ArgumentName === "string" ? S3_ARGUMENT_LABELS.get(detail.ArgumentName.toLowerCase()) : undefined
  const requestId = safeRequestId(typeof metadata.requestId === "string" ? metadata.requestId : null)
  return { ok: false, error: `R2 respondeu ${status}.` + (code ? ` Código S3: ${code}.` : "") + (argument ? ` Argumento: ${argument}.` : "") + (requestId ? ` ID da requisição: ${requestId}.` : "") }
}

/** Envia os bytes já otimizados; os nomes únicos e as URLs existentes são preservados. */
export async function putObject(key: string, body: Uint8Array<ArrayBuffer>, contentType: string): Promise<R2Result> {
  const env = getR2Env()
  if (!env.ok) return missingConfig(env.issues)
  if (!key || key.startsWith("/") || key.includes("\0")) return { ok: false, error: "Caminho de imagem inválido." }
  if (!body.byteLength) return { ok: false, error: "A imagem está vazia." }
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return { ok: false, error: "Formato de imagem não suportado." }
  try {
    await env.client.send(new PutObjectCommand({
      Bucket: env.bucket, Key: key, Body: body,
      ContentType: contentType, ContentLength: body.byteLength,
      CacheControl: "public, max-age=31536000, immutable",
    }))
    return { ok: true }
  } catch (error) {
    return sdkFailure(error)
  }
}

/** Mantém o contrato Response utilizado pela rota pública /img. */
export async function getObject(key: string): Promise<Response | null> {
  const env = getR2Env()
  if (!env.ok) return null
  try {
    const object = await env.client.send(new GetObjectCommand({ Bucket: env.bucket, Key: key }))
    if (!object.Body) return null
    const headers = new Headers()
    if (object.ContentType) headers.set("Content-Type", object.ContentType)
    if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength))
    if (object.CacheControl) headers.set("Cache-Control", object.CacheControl)
    if (object.ETag) headers.set("ETag", object.ETag)
    if (object.LastModified) headers.set("Last-Modified", object.LastModified.toUTCString())
    return new Response(object.Body.transformToWebStream(), { headers })
  } catch {
    return null
  }
}

/** Remove somente as chaves explicitamente fornecidas; objeto inexistente continua sendo sucesso. */
export async function deleteObjects(keys: string[]): Promise<R2Result> {
  if (!keys.length) return { ok: true }
  const env = getR2Env()
  if (!env.ok) return missingConfig(env.issues)
  const results = await Promise.all(keys.map(async (key): Promise<R2Result> => {
    try {
      await env.client.send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key }))
      return { ok: true }
    } catch (error) {
      const detail = error && typeof error === "object" ? error as { $metadata?: { httpStatusCode?: number } } : null
      return detail?.$metadata?.httpStatusCode === 404 ? { ok: true } : sdkFailure(error)
    }
  }))
  return results.find((result) => !result.ok) ?? { ok: true }
}
