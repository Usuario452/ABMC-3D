import "server-only"

import postgres from "postgres"
import { requireDatabaseEnv } from "@/lib/env"

/**
 * Conexão com o PostgreSQL (qualquer provedor: Supabase, Neon, servidor próprio).
 *
 * - prepare: false — compatível com poolers em modo transaction (PgBouncer/Supavisor,
 *   porta 6543 no Supabase), indicados para ambientes serverless como a Vercel.
 * - Uma única instância por processo; em desenvolvimento ela sobrevive ao hot reload.
 */
export type Sql = postgres.Sql

const globalForDb = globalThis as unknown as { kuboSql?: Sql }

function createSql(): Sql {
  const env = requireDatabaseEnv()
  return postgres(env.url, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
}

/** Cliente SQL. Lança MissingConfigError se DATABASE_URL não estiver definida. */
export function db(): Sql {
  globalForDb.kuboSql ??= createSql()
  return globalForDb.kuboSql
}

/**
 * Conexão própria para funções com "use cache". O Next não permite que o cache aguarde promessas
 * criadas fora dele (como a conexão do pool compartilhado, aberta por outra requisição), então a
 * conexão é criada e encerrada dentro do escopo do cache. Só roda quando o cache está vazio ou vencido.
 */
export async function withScopedDb<T>(run: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = postgres(requireDatabaseEnv().url, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    onnotice: () => {},
  })
  try {
    return await run(sql)
  } finally {
    await sql.end({ timeout: 2 })
  }
}

/** Código SQLSTATE de um erro do Postgres, se houver. */
export function pgErrorCode(error: unknown): string | undefined {
  return error instanceof postgres.PostgresError ? error.code : undefined
}
