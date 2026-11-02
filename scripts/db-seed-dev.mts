/** Cria o administrador de desenvolvimento (db/seed/dev.sql). Recusa bancos que não sejam locais. */
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL não definida.")
  process.exit(1)
}
const host = new URL(url).hostname
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error(`Recusado: ${host} não é um banco local. O seed de desenvolvimento nunca roda em produção.`)
  process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
  await sql.unsafe(await readFile(join(import.meta.dirname, "..", "db", "seed", "dev.sql"), "utf8"))
  console.log("Administrador de desenvolvimento criado (credenciais em db/seed/dev.sql).")
} finally {
  await sql.end()
}
