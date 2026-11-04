import { z } from "zod"
import { siteConfig } from "@/config/site"
import { MAX_PRICE_CENTS, parsePriceToCents } from "@/lib/format"
import { SLUG_PATTERN } from "@/lib/slug"
import { CATALOG_SORTS, type CatalogQuery, type CatalogSort } from "@/types/catalog"

// ---------------------------------------------------------------------------
// Campos reutilizáveis
// ---------------------------------------------------------------------------

export const uuidSchema = z.uuid({ message: "Identificador inválido." })

/** Aceita tanto o texto digitado ("19,90") quanto um número de centavos. */
const priceField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const cents = typeof value === "number" ? value : parsePriceToCents(value)
  if (cents === null || !Number.isInteger(cents) || cents < 0 || cents > MAX_PRICE_CENTS) {
    ctx.addIssue({ code: "custom", message: "Informe um preço válido (ex.: 49,90)." })
    return z.NEVER
  }
  return cents
})

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").pipe(z.email("Informe um e-mail válido.")),
  password: z.string().min(1, "Informe a senha.").max(200, "Senha muito longa."),
  /** "Lembrar de mim": mantém a sessão por mais tempo, mesmo depois de fechar o navegador. */
  remember: z.boolean().optional(),
})

export type SignInInput = z.input<typeof signInSchema>

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  // Opcional: texto vazio vira null no banco.
  description: z.string().trim().max(300, "A descrição pode ter no máximo 300 caracteres.").optional(),
  // O slug não vem do formulário: o servidor gera a partir do nome na criação.
  isActive: z.boolean(),
})

export type CategoryInput = z.input<typeof categorySchema>

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do produto.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  // O slug não vem do formulário: o servidor gera a partir do nome (ver actions/products.ts).
  description: z.string().trim().max(5000, "A descrição pode ter no máximo 5000 caracteres."),
  internalNotes: z.string().trim().max(2000, "A anotação pode ter no máximo 2000 caracteres.").default(""),
  price: priceField,
  // Uma ou mais categorias, na ordem escolhida; a primeira vira o rótulo exibido no card.
  categoryIds: z
    .array(uuidSchema)
    .min(1, "Selecione ao menos uma categoria.")
    .max(10, "Escolha no máximo 10 categorias.")
    .refine((ids) => new Set(ids).size === ids.length, "Categoria repetida."),
  isActive: z.boolean(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
})

export type ProductInput = z.input<typeof productSchema>
export type ProductData = z.output<typeof productSchema>

export const imageAltSchema = z.string().trim().max(200, "O texto alternativo pode ter no máximo 200 caracteres.")

export const reorderImagesSchema = z.object({
  productId: uuidSchema,
  imageIds: z.array(uuidSchema).min(1).max(50),
})

// ---------------------------------------------------------------------------
// Carrinho
// ---------------------------------------------------------------------------

export const cartRequestSchema = z
  .array(
    z.object({
      productId: uuidSchema,
      quantity: z.number().int().min(1).max(siteConfig.cart.maxQuantityPerItem),
    }),
  )
  .max(siteConfig.cart.maxItems)

export type CartRequest = z.infer<typeof cartRequestSchema>

// ---------------------------------------------------------------------------
// Parâmetros de busca do catálogo
// ---------------------------------------------------------------------------

type RawSearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseCatalogQuery(params: RawSearchParams): CatalogQuery {
  const q = (first(params.q) ?? "").trim().slice(0, 80)

  const rawCategory = (first(params.categoria) ?? "").trim()
  const category = SLUG_PATTERN.test(rawCategory) ? rawCategory : ""

  const rawSort = first(params.ordem) ?? ""
  const sort: CatalogSort = Object.hasOwn(CATALOG_SORTS, rawSort) ? (rawSort as CatalogSort) : "nome-asc"

  const rawPage = Number.parseInt(first(params.pagina) ?? "1", 10)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 1000) : 1

  let minPrice = parsePriceParam(first(params["preco-min"]))
  let maxPrice = parsePriceParam(first(params["preco-max"]))
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice]

  const featured = first(params.destaques) === "1"
  const recent = first(params.novidades) === "1"

  return { q, category, sort, page, minPrice, maxPrice, featured, recent }
}

/** Preço da URL em reais inteiros (0 a 1.000.000); vazio ou inválido = sem limite. */
function parsePriceParam(value: string | undefined): number | null {
  if (!value || !/^\d{1,7}$/.test(value.trim())) return null
  return Math.min(Number(value.trim()), 1_000_000)
}
