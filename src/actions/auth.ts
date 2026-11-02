"use server"

import { redirect } from "next/navigation"
import { failure, validationFailure, type ActionFailure } from "@/lib/actions/result"
import { endSession, startSession } from "@/lib/auth/admin"
import { getDummyHash, verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { getDatabaseEnv } from "@/lib/env"
import { signInSchema, type SignInInput } from "@/lib/validation/schemas"

/** Limite de tentativas com falha por e-mail dentro da janela abaixo. */
const MAX_FAILED_ATTEMPTS = 8
const ATTEMPT_WINDOW = "15 minutes"

function safeRedirectPath(value: string | undefined) {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return "/admin"
  }
  return value
}

export async function signIn(input: SignInInput, redirectTo?: string): Promise<ActionFailure> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  if (!getDatabaseEnv().ok) {
    return failure("O banco de dados não está configurado. Defina DATABASE_URL.", { code: "config" })
  }

  const email = parsed.data.email.toLowerCase()
  const sql = db()

  let adminId: string
  try {
    const [{ attempts }] = await sql<{ attempts: number }[]>`
      select count(*)::int as attempts
      from admin_login_attempts
      where email = ${email} and created_at > now() - ${ATTEMPT_WINDOW}::interval
    `
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      return failure("Muitas tentativas. Aguarde alguns minutos e tente novamente.")
    }

    const [admin] = await sql<{ id: string; password_hash: string }[]>`
      select id, password_hash from admin_users where email = ${email}
    `
    // Mesmo sem usuário, compara com um hash fixo: o tempo de resposta não revela se o e-mail existe.
    const valid = await verifyPassword(parsed.data.password, admin?.password_hash ?? (await getDummyHash()))
    if (!admin || !valid) {
      await sql`insert into admin_login_attempts (email) values (${email})`
      await sql`delete from admin_login_attempts where created_at < now() - interval '1 day'`
      return failure("E-mail ou senha incorretos.")
    }

    await sql`delete from admin_login_attempts where email = ${email}`
    adminId = admin.id
    await startSession(adminId, parsed.data.remember === true)
  } catch {
    return failure("Não foi possível entrar agora. Verifique a conexão com o banco e tente novamente.")
  }

  redirect(safeRedirectPath(redirectTo))
}

export async function signOut() {
  try {
    await endSession()
  } catch {
    // Mesmo com falha no banco, o cookie já foi apagado e o usuário vai para o login.
  }
  redirect("/admin/login?motivo=saiu")
}
