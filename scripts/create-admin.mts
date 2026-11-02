/**
 * Cria um administrador do painel ou redefine a senha de um existente.
 * A senha é digitada no terminal (sem eco) e só o hash scrypt vai para o banco.
 * Redefinir a senha encerra todas as sessões abertas desse administrador.
 *
 *   npm run db:create-admin          → banco do .env.local
 *   npm run db:create-admin:prod     → banco do .env.vercel.local
 */
import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import postgres from "postgres"
import { hashPassword } from "../src/lib/auth/password.ts"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL não definida. Configure o arquivo .env e tente novamente.")
  process.exit(1)
}

async function ask(question: string) {
  const rl = createInterface({ input: stdin, output: stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/** Lê uma linha sem exibir o que é digitado. */
function askHidden(question: string) {
  return new Promise<string>((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error("Execute em um terminal interativo para digitar a senha."))
      return
    }
    stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    let value = ""
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off("data", onData)
          stdout.write("\n")
          resolve(value)
          return
        }
        if (char === "\u0003") {
          stdout.write("\n")
          process.exit(130)
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1)
        else value += char
      }
    }
    stdin.on("data", onData)
  })
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} })

try {
  console.log(`Banco: ${new URL(url).hostname}`)
  const email = (await ask("E-mail do administrador: ")).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.")

  const password = await askHidden("Senha: ")
  if (password.length === 0) throw new Error("Informe uma senha.")
  if ((await askHidden("Confirme a senha: ")) !== password) throw new Error("As senhas não conferem.")

  const passwordHash = await hashPassword(password)
  const [admin] = await sql<{ id: string; created: boolean }[]>`
    insert into admin_users (email, password_hash)
    values (${email}, ${passwordHash})
    on conflict (email) do update set password_hash = excluded.password_hash
    returning id, (xmax = 0) as created
  `
  if (!admin.created) await sql`delete from admin_sessions where admin_id = ${admin.id}`

  console.log(admin.created ? `Administrador ${email} criado.` : `Senha de ${email} redefinida; sessões abertas encerradas.`)
} catch (error) {
  console.error("Erro:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
