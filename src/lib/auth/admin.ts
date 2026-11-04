import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { after, connection } from "next/server"
import { db } from "@/lib/db"
import { getDatabaseEnv, type EnvIssue } from "@/lib/env"

export type AdminUser = { id: string; email: string }

export type AdminStatus =
  | { status: "ok"; user: AdminUser }
  | { status: "unauthenticated" }
  | { status: "unconfigured"; issues: EnvIssue[] }
  | { status: "error"; message: string }

/** Nome do cookie de sessão do painel (também lido pelo proxy). */
export const SESSION_COOKIE = "abmc_admin_session"
/** Com "lembrar de mim": cookie persistente. Sem: cookie de sessão (some ao fechar o navegador). */
const REMEMBER_DAYS = 30
const SHORT_SESSION_HOURS = 12

/** O cookie guarda o token; o banco guarda só o SHA-256 dele (um vazamento do banco não expõe sessões). */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

/** Cria a sessão no banco e grava o cookie httpOnly. Use apenas em Server Actions. */
export async function startSession(adminId: string, remember = false) {
  const token = randomBytes(32).toString("base64url")
  const lifetimeMs = remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SHORT_SESSION_HOURS * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + lifetimeMs)

  const sql = db()
  await sql`delete from admin_sessions where expires_at < now()`
  await sql`
    insert into admin_sessions (token_hash, admin_id, expires_at)
    values (${hashToken(token)}, ${adminId}, ${expiresAt})
  `

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Sem "lembrar de mim" não há expires: o navegador apaga o cookie ao ser fechado.
    ...(remember ? { expires: expiresAt } : {}),
  })
}

/** Remove a sessão atual do banco e apaga o cookie. Use apenas em Server Actions. */
export async function endSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  cookieStore.delete(SESSION_COOKIE)
  if (token && getDatabaseEnv().ok) {
    // O registro no banco é removido depois da resposta: o cookie já foi apagado, então o usuário
    // sai na hora, sem esperar a consulta.
    after(async () => {
      try {
        await db()`delete from admin_sessions where token_hash = ${hashToken(token)}`
      } catch {
        // Sem banco agora: a sessão expira sozinha e o cookie já não existe mais.
      }
    })
  }
}

/**
 * Verifica no servidor a sessão do painel: o token do cookie precisa existir no
 * banco, estar dentro da validade e pertencer a um administrador cadastrado.
 * Memorizado por requisição com React.cache.
 */
export const getAdminStatus = cache(async (): Promise<AdminStatus> => {
  // Sempre no momento da requisição: a sessão depende de cookies e do relógio.
  await connection()
  const env = getDatabaseEnv()
  if (!env.ok) return { status: "unconfigured", issues: env.issues }

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return { status: "unauthenticated" }

  try {
    const [user] = await db()<AdminUser[]>`
      select a.id, a.email
      from admin_sessions s
      join admin_users a on a.id = s.admin_id
      where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    `
    return user ? { status: "ok", user } : { status: "unauthenticated" }
  } catch {
    return { status: "error", message: "Não foi possível conectar ao banco de dados. Verifique a conexão." }
  }
})

/** Use em páginas do painel. Redireciona quem não está autenticado. */
export async function requireAdminPage(): Promise<AdminUser> {
  const result = await getAdminStatus()
  if (result.status === "ok") return result.user
  if (result.status === "unauthenticated") redirect("/admin/login?motivo=sessao-expirada")
  redirect("/admin/acesso-negado")
}

/** Use no início de toda Server Action administrativa. */
export async function authorizeAdminAction() {
  const result = await getAdminStatus()
  switch (result.status) {
    case "ok":
      return { ok: true as const, user: result.user, sql: db() }
    case "unauthenticated":
      return {
        ok: false as const,
        code: "unauthenticated" as const,
        error: "Sua sessão expirou. Entre novamente para continuar.",
      }
    case "unconfigured":
      return { ok: false as const, code: "config" as const, error: "O banco de dados não está configurado." }
    default:
      return { ok: false as const, error: result.message }
  }
}
