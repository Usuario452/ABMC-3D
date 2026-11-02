import "server-only"

import type { Cached } from "@/lib/data/catalog"
import { getDatabaseEnv, type EnvIssue } from "@/lib/env"

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "config"; issues: EnvIssue[] }
  | { ok: false; kind: "error"; message: string }

/**
 * Executa uma consulta da vitrine tratando configuração ausente e falhas de conexão.
 * Use sempre dentro de um <Suspense>: em caso de falha, a consulta vira conteúdo
 * dinâmico, resolvido no momento da requisição.
 */
export async function load<T>(query: () => Promise<Cached<T>>): Promise<LoadResult<T>> {
  const env = getDatabaseEnv()
  if (!env.ok) return { ok: false, kind: "config", issues: env.issues }

  const result = await query()
  if (result.ok) return { ok: true, data: result.data }
  return {
    ok: false,
    kind: "error",
    message: "Não foi possível carregar os dados agora. Verifique sua conexão e tente novamente.",
  }
}
