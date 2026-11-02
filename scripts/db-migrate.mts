/**
 * Aplica as migrations de db/migrations/*.sql em ordem alfabética, uma única vez cada.
 * Cada arquivo roda em uma transação; os já aplicados ficam em public.schema_migrations.
 *
 *   npm run db:migrate          → DATABASE_URL do .env
 */
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import postgres from "postgres"

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "db", "migrations")

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL não definida. Configure o arquivo .env e tente novamente.")
  process.exit(1)
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} })

try {
  await sql`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const applied = new Set((await sql<{ name: string }[]>`select name from public.schema_migrations`).map((r) => r.name))
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort()
  const pending = files.filter((file) => !applied.has(file))

  const host = new URL(url).hostname
  if (pending.length === 0) {
    console.log(`Banco em ${host} já está atualizado (${files.length} migration(s)).`)
  }

  for (const file of pending) {
    const content = await readFile(join(MIGRATIONS_DIR, file), "utf8")
    await sql.begin(async (tx) => {
      await tx.unsafe(content)
      await tx`insert into public.schema_migrations (name) values (${file})`
    })
    console.log(`Aplicada: ${file} (${host})`)
  }
} catch (error) {
  console.error("Falha ao aplicar migrations:", error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await sql.end()
}
