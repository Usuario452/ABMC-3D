import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"

/**
 * Executa as migrations reais (db/migrations) em um PostgreSQL embutido (PGlite)
 * e verifica as regras do esquema. Não depende de nenhum provedor.
 */

const migrationsDir = path.resolve(__dirname, "../../db/migrations")

const CAT = "10000000-0000-4000-8000-000000000001"
const CAT_EMPTY = "10000000-0000-4000-8000-000000000002"
const PRODUCT = "20000000-0000-4000-8000-000000000001"
const IMG = ["30000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000002"]

let db: PGlite

async function sqlState(statement: string, params: unknown[] = []) {
  try {
    await db.query(statement, params)
    return "ok"
  } catch (error) {
    return (error as { code?: string }).code ?? "erro"
  }
}

beforeAll(async () => {
  db = new PGlite()
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(migrationsDir, file), "utf8"))
  }

  await db.exec(`
    insert into categories (id, name, slug) values
      ('${CAT}', 'Decoração', 'decoracao'),
      ('${CAT_EMPTY}', 'Vazia', 'vazia');
    insert into products (id, name, slug, price_cents, category_id) values
      ('${PRODUCT}', 'Vaso', 'vaso', 4990, '${CAT}');
    insert into product_images (id, product_id, storage_path, position) values
      ('${IMG[0]}', '${PRODUCT}', 'products/${PRODUCT}/a.webp', 0),
      ('${IMG[1]}', '${PRODUCT}', 'products/${PRODUCT}/b.webp', 1);
  `)
})

describe("restrições do catálogo", () => {
  it("rejeita slug fora do formato, preço negativo e slug duplicado", async () => {
    expect(await sqlState(`insert into categories (name, slug) values ('X', 'Com Espaço')`)).toBe("23514")
    expect(
      await sqlState(`insert into products (name, slug, price_cents, category_id) values ('X', 'x', -1, $1)`, [CAT]),
    ).toBe("23514")
    expect(
      await sqlState(`insert into products (name, slug, price_cents, category_id) values ('X', 'vaso', 1, $1)`, [CAT]),
    ).toBe("23505")
  })

  it("exige a imagem na pasta do próprio produto", async () => {
    expect(
      await sqlState(`insert into product_images (product_id, storage_path, position) values ($1, $2, 5)`, [
        PRODUCT,
        `products/${CAT}/x.webp`,
      ]),
    ).toBe("23514")
  })

  it("impede excluir categoria com produtos e permite excluir categoria vazia", async () => {
    expect(await sqlState(`delete from categories where id = $1`, [CAT])).toBe("23001")
    expect(await sqlState(`delete from categories where id = $1`, [CAT_EMPTY])).toBe("ok")
  })

  it("atualiza updated_at automaticamente", async () => {
    await db.query(`update products set updated_at = now() - interval '1 day' where id = $1`, [PRODUCT])
    await db.query(`update products set name = 'Vaso Novo' where id = $1`, [PRODUCT])
    const { rows } = await db.query<{ recent: boolean }>(
      `select updated_at > now() - interval '1 minute' as recent from products where id = $1`,
      [PRODUCT],
    )
    expect(rows[0].recent).toBe(true)
  })
})

describe("reorder_product_images", () => {
  it("troca a imagem principal em uma única chamada", async () => {
    await db.query(`select reorder_product_images($1, $2::uuid[])`, [PRODUCT, [IMG[1], IMG[0]]])
    const { rows } = await db.query<{ id: string }>(
      `select id from product_images where product_id = $1 order by position`,
      [PRODUCT],
    )
    expect(rows.map((r) => r.id)).toEqual([IMG[1], IMG[0]])
  })

  it("rejeita listas incompletas ou com IDs repetidos", async () => {
    expect(await sqlState(`select reorder_product_images($1, $2::uuid[])`, [PRODUCT, [IMG[0]]])).toBe("22023")
    expect(await sqlState(`select reorder_product_images($1, $2::uuid[])`, [PRODUCT, [IMG[0], IMG[0]]])).toBe("22023")
  })
})

describe("bloqueio de APIs externas", () => {
  it("ativa RLS em todas as tabelas do esquema public", async () => {
    const { rows } = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `)
    expect(rows).toEqual([])
  })

  it("nega leitura a outros papéis, sem afetar o dono das tabelas", async () => {
    await db.exec(`create role api_visitor`)
    await db.exec(`set role api_visitor`)
    const denied = await sqlState(`select * from categories`)
    await db.exec(`reset role`)
    expect(denied).toBe("42501")
    const { rows } = await db.query<{ total: number }>(`select count(*)::int as total from categories`)
    expect(rows[0].total).toBeGreaterThan(0)
  })
})

describe("administradores e sessões", () => {
  it("exige e-mail em minúsculas e único", async () => {
    expect(await sqlState(`insert into admin_users (email, password_hash) values ('Admin@Abmc3d.com', 'x')`)).toBe("23514")
    expect(await sqlState(`insert into admin_users (email, password_hash) values ('admin@abmc3d.com', 'x')`)).toBe("ok")
    expect(await sqlState(`insert into admin_users (email, password_hash) values ('admin@abmc3d.com', 'y')`)).toBe("23505")
  })

  it("encerra as sessões quando o administrador é removido", async () => {
    await db.exec(`
      insert into admin_sessions (token_hash, admin_id, expires_at)
      select 'hash-1', id, now() + interval '1 day' from admin_users where email = 'admin@abmc3d.com';
      delete from admin_users where email = 'admin@abmc3d.com';
    `)
    const { rows } = await db.query<{ total: number }>(`select count(*)::int as total from admin_sessions`)
    expect(rows[0].total).toBe(0)
  })

  it("exclui as imagens junto com o produto", async () => {
    await db.query(`delete from products where id = $1`, [PRODUCT])
    const { rows } = await db.query<{ total: number }>(`select count(*)::int as total from product_images`)
    expect(rows[0].total).toBe(0)
  })
})

describe("eventos de análise da vitrine", () => {
  const OTHER_PRODUCT = "20000000-0000-4000-8000-000000000002"

  it("aceita só os tipos conhecidos e quantidades válidas", async () => {
    expect(await sqlState(`insert into analytics_events (type) values ('product_view')`)).toBe("ok")
    expect(await sqlState(`insert into analytics_events (type) values ('clique_qualquer')`)).toBe("23514")
    expect(await sqlState(`insert into analytics_events (type, quantity) values ('add_to_cart', 0)`)).toBe("23514")
    expect(await sqlState(`insert into analytics_events (type, value_cents) values ('add_to_cart', -1)`)).toBe("23514")
  })

  it("mantém o histórico quando o produto é excluído", async () => {
    await db.exec(`
      insert into products (id, name, slug, price_cents, category_id) values ('${OTHER_PRODUCT}', 'Luminária', 'luminaria', 7900, '${CAT}');
      insert into analytics_events (type, product_id) values ('product_view', '${OTHER_PRODUCT}');
      delete from products where id = '${OTHER_PRODUCT}';
    `)
    const { rows } = await db.query<{ total: number }>(
      `select count(*)::int as total from analytics_events where type = 'product_view' and product_id is null`,
    )
    expect(rows[0].total).toBeGreaterThanOrEqual(1)
  })
})

describe("visitas da vitrine", () => {
  const VISITOR = "40000000-0000-4000-8000-000000000001"
  const SESSION = "50000000-0000-4000-8000-000000000001"

  it("exige caminho iniciado em / e dispositivo conhecido", async () => {
    expect(await sqlState(`insert into site_visits (visitor_id, session_id, path) values ('${VISITOR}', '${SESSION}', '/catalogo')`)).toBe("ok")
    expect(await sqlState(`insert into site_visits (visitor_id, session_id, path) values ('${VISITOR}', '${SESSION}', 'catalogo')`)).toBe("23514")
    expect(await sqlState(`insert into site_visits (visitor_id, session_id, path, device) values ('${VISITOR}', '${SESSION}', '/', 'tv')`)).toBe("23514")
  })
})

describe("buscas do catálogo", () => {
  it("aceita só os tipos conhecidos e resultados não negativos", async () => {
    expect(await sqlState(`insert into catalog_events (type, query, results_count) values ('search', 'vaso', 0)`)).toBe("ok")
    expect(await sqlState(`insert into catalog_events (type, category_slug) values ('category_view', 'decoracao')`)).toBe("ok")
    expect(await sqlState(`insert into catalog_events (type) values ('outro')`)).toBe("23514")
    expect(await sqlState(`insert into catalog_events (type, results_count) values ('search', -1)`)).toBe("23514")
  })
})
