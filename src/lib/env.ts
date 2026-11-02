import { z } from "zod"

/**
 * Validação das variáveis de ambiente.
 *
 * DATABASE_URL é lida apenas no servidor (sem prefixo NEXT_PUBLIC_): no navegador
 * ela é sempre undefined. As variáveis NEXT_PUBLIC_* precisam ser lidas de forma
 * literal (process.env.NEXT_PUBLIC_X) para que o Next.js as injete no bundle.
 */

export type EnvIssue = { name: string; problem: "ausente" | "inválida" }

export type DatabaseEnv = { ok: true; url: string } | { ok: false; issues: EnvIssue[] }

const urlSchema = z.string().trim().pipe(z.url({ protocol: /^https?$/ }))

const databaseUrlSchema = z.string().trim().pipe(z.url({ protocol: /^postgres(ql)?$/ }))

export function getDatabaseEnv(): DatabaseEnv {
  const raw = process.env.DATABASE_URL
  if (!raw?.trim()) return { ok: false, issues: [{ name: "DATABASE_URL", problem: "ausente" }] }

  const url = databaseUrlSchema.safeParse(raw)
  if (!url.success) return { ok: false, issues: [{ name: "DATABASE_URL", problem: "inválida" }] }

  return { ok: true, url: url.data }
}

export function isDatabaseConfigured() {
  return getDatabaseEnv().ok
}

/** Erro lançado quando uma operação exige o banco, mas ele não está configurado. */
export class MissingConfigError extends Error {
  readonly issues: EnvIssue[]

  constructor(issues: EnvIssue[]) {
    super(
      `Configuração pendente: ${issues.map((issue) => `${issue.name} (${issue.problem})`).join(", ")}`,
    )
    this.name = "MissingConfigError"
    this.issues = issues
  }
}

export function requireDatabaseEnv() {
  const env = getDatabaseEnv()
  if (!env.ok) throw new MissingConfigError(env.issues)
  return env
}

/** Endereço da API S3 do R2: exige assinatura, então nunca serve como URL pública das imagens. */
export const isR2ApiUrl = (url: string) => /^https?:\/\/[^/]+\.r2\.cloudflarestorage\.com(\/|$)/i.test(url)

/**
 * URL pública do bucket de imagens no R2 (domínio próprio ou r2.dev). null se ausente, inválida ou se for
 * o endereço da API (aí as imagens seguem com URL assinada).
 */
export function getImagesBaseUrl() {
  const parsed = urlSchema.safeParse(process.env.NEXT_PUBLIC_IMAGES_BASE_URL ?? "")
  if (!parsed.success || isR2ApiUrl(parsed.data)) return null
  return parsed.data.replace(/\/+$/, "")
}

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const parsed = urlSchema.safeParse(raw ?? "")
  return parsed.success ? parsed.data.replace(/\/+$/, "") : "http://localhost:3000"
}
