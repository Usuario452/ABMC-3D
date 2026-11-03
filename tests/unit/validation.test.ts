import { afterEach, describe, expect, it, vi } from "vitest"
import { getDatabaseEnv, getImagesBaseUrl } from "@/lib/env"
import { buildStoragePath, detectImageType, isValidStoragePath } from "@/lib/images"
import { categorySchema, parseCatalogQuery, productSchema, signInSchema } from "@/lib/validation/schemas"

const CATEGORY = "33333333-3333-4333-8333-333333333333"
const PRODUCT = "44444444-4444-4444-8444-444444444444"

describe("productSchema", () => {
  it("aceita a anotação interna e limita o tamanho", () => {
    const base = { name: "Vaso", description: "", price: "10", categoryId: "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f", isActive: true, isAvailable: true, isFeatured: false }
    expect(productSchema.parse(base).internalNotes).toBe("")
    expect(productSchema.parse({ ...base, internalNotes: "  Importado de x  " }).internalNotes).toBe("Importado de x")
    expect(productSchema.safeParse({ ...base, internalNotes: "a".repeat(2001) }).success).toBe(false)
  })

  const valid = {
    name: "  Vaso Geométrico  ",
    description: "Peça impressa em 3D.",
    price: "49,90",
    categoryId: CATEGORY,
    isActive: true,
    isAvailable: true,
    isFeatured: false,
  }

  it("normaliza nome e converte preço para centavos", () => {
    const parsed = productSchema.parse(valid)
    expect(parsed.name).toBe("Vaso Geométrico")
    expect(parsed.price).toBe(4990)
  })

  it("rejeita preço inválido e categoria ausente", () => {
    const result = productSchema.safeParse({ ...valid, price: "-1", categoryId: "" })
    expect(result.success).toBe(false)
    const fields = result.error?.issues.map((issue) => issue.path[0])
    expect(fields).toEqual(expect.arrayContaining(["price", "categoryId"]))
  })
})

describe("categorySchema e signInSchema", () => {
  it("valida campos obrigatórios", () => {
    expect(categorySchema.safeParse({ name: "", isActive: true }).success).toBe(false)
    expect(categorySchema.safeParse({ name: "Decoração", isActive: true }).success).toBe(true)
    expect(signInSchema.safeParse({ email: "x", password: "1" }).success).toBe(false)
    expect(signInSchema.safeParse({ email: "admin@exemplo.com", password: "1" }).success).toBe(true)
  })
})

describe("parseCatalogQuery", () => {
  it("usa padrões seguros para parâmetros inválidos", () => {
    expect(parseCatalogQuery({ ordem: "drop table", pagina: "-3", categoria: "../x" })).toEqual({
      q: "",
      category: "",
      sort: "nome-asc",
      page: 1,
    })
    expect(parseCatalogQuery({ q: " vaso ", categoria: "decoracao", ordem: "preco-desc", pagina: "2" })).toEqual({
      q: "vaso",
      category: "decoracao",
      sort: "preco-desc",
      page: 2,
    })
  })
})

describe("imagens", () => {
  it("detecta o tipo real pelos bytes iniciais", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg")
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png")
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")
    expect(detectImageType(webp)).toBe("image/webp")
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull()
  })

  it("gera caminhos seguros dentro da pasta do produto", () => {
    const path = buildStoragePath(PRODUCT, "image/webp", "../../ABC-123?x", 1700000000000)
    expect(path).toBe(`products/${PRODUCT}/1700000000000-abc123x.webp`)
    expect(isValidStoragePath(path, PRODUCT)).toBe(true)
    expect(isValidStoragePath(`products/${CATEGORY}/a.webp`, PRODUCT)).toBe(false)
    expect(isValidStoragePath(`products/${PRODUCT}/../x.webp`, PRODUCT)).toBe(false)
  })
})

describe("variáveis de ambiente", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("indica DATABASE_URL ausente sem expor valores", () => {
    vi.stubEnv("DATABASE_URL", "")
    expect(getDatabaseEnv()).toEqual({ ok: false, issues: [{ name: "DATABASE_URL", problem: "ausente" }] })
  })

  it("aceita apenas URLs postgres:// ou postgresql://", () => {
    vi.stubEnv("DATABASE_URL", "https://exemplo.com")
    expect(getDatabaseEnv()).toEqual({ ok: false, issues: [{ name: "DATABASE_URL", problem: "inválida" }] })

    vi.stubEnv("DATABASE_URL", "postgresql://user:senha@db.exemplo.com:6543/postgres")
    expect(getDatabaseEnv()).toEqual({ ok: true, url: "postgresql://user:senha@db.exemplo.com:6543/postgres" })
  })

  it("normaliza a URL pública das imagens", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGES_BASE_URL", "https://img.exemplo.com/")
    expect(getImagesBaseUrl()).toBe("https://img.exemplo.com")
    vi.stubEnv("NEXT_PUBLIC_IMAGES_BASE_URL", "")
    expect(getImagesBaseUrl()).toBeNull()
    // Endereço da API do R2 não é público: ignorado, para as imagens seguirem com URL assinada.
    vi.stubEnv("NEXT_PUBLIC_IMAGES_BASE_URL", "https://conta123.r2.cloudflarestorage.com")
    expect(getImagesBaseUrl()).toBeNull()
  })
})
