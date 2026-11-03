import "server-only"

import type { Sql } from "@/lib/db"
import { slugify } from "@/lib/slug"

/**
 * Slug a partir do nome, único na tabela: "vaso", "vaso-2", "vaso-3"…
 * Gerado só na criação; depois não muda, para os links continuarem valendo.
 * (O índice único do banco continua sendo a garantia final.)
 */
export async function uniqueSlug(sql: Sql, table: "products" | "categories", name: string, fallback: string) {
  const base = slugify(name, table === "products" ? 130 : 90) || fallback
  const taken = new Set(
    (await sql<{ slug: string }[]>`
      select slug from ${sql(table)} where slug = ${base} or slug like ${`${base}-%`}
    `).map((row) => row.slug),
  )
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
