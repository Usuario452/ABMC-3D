import { describe, expect, it } from "vitest"
import { isProductSort, productVisibility, sortProducts } from "@/components/admin/product-status"

const category = { id: "c", name: "Chaveiro", is_active: true }
const product = (name: string, extra: Partial<{ is_active: boolean; price_cents: number; cartIntents: number; updated_at: Date }>) => ({
  name,
  is_active: true,
  is_available: true,
  categories: [category],
  price_cents: 1000,
  cartIntents: 0,
  updated_at: new Date("2026-11-01"),
  ...extra,
})

const list = [
  product("Polvo", { is_active: false, price_cents: 2000, cartIntents: 5, updated_at: new Date("2026-11-03") }),
  product("Abacaxi", { price_cents: 999, cartIntents: 1, updated_at: new Date("2026-11-01") }),
  product("Chaveiro", { price_cents: 1500, cartIntents: 3, updated_at: new Date("2026-11-02") }),
]
const names = (items: typeof list) => items.map((item) => item.name)

describe("sortProducts", () => {
  it("põe os publicados primeiro, mantendo a ordem dentro de cada grupo", () => {
    expect(names(sortProducts(list, "publicados"))).toEqual(["Abacaxi", "Chaveiro", "Polvo"])
    expect(productVisibility(list[0]).visible).toBe(false)
  })

  it("ordena por data, nome, preço e intenções", () => {
    expect(names(sortProducts(list, "recentes"))).toEqual(["Polvo", "Chaveiro", "Abacaxi"])
    expect(names(sortProducts(list, "nome"))).toEqual(["Abacaxi", "Chaveiro", "Polvo"])
    expect(names(sortProducts(list, "preco-asc"))).toEqual(["Abacaxi", "Chaveiro", "Polvo"])
    expect(names(sortProducts(list, "preco-desc"))).toEqual(["Polvo", "Chaveiro", "Abacaxi"])
    expect(names(sortProducts(list, "intencoes"))).toEqual(["Polvo", "Chaveiro", "Abacaxi"])
  })

  it("não altera a lista original", () => {
    sortProducts(list, "nome")
    expect(names(list)).toEqual(["Polvo", "Abacaxi", "Chaveiro"])
  })
})

describe("isProductSort", () => {
  it("aceita só as ordens conhecidas", () => {
    expect(isProductSort("preco-asc")).toBe(true)
    expect(isProductSort("aleatorio")).toBe(false)
    expect(isProductSort(undefined)).toBe(false)
  })
})

describe("productVisibility", () => {
  it("só esconde por categoria quando todas as categorias do produto estão inativas", () => {
    const off = { ...category, is_active: false }
    const base = { name: "X", is_active: true, is_available: true }
    expect(productVisibility({ ...base, categories: [off, category] }).visible).toBe(true)
    expect(productVisibility({ ...base, categories: [off] }).reason).toBe("Categoria inativa")
    expect(productVisibility({ ...base, categories: [off, off] }).reason).toBe("Categorias inativas")
  })
})

