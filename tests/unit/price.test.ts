import { describe, expect, it } from "vitest"
import { discountPercent } from "@/components/catalog/price"

describe("discountPercent", () => {
  it("calcula o desconto arredondado em relação ao preço original", () => {
    expect(discountPercent(1000, 2000)).toBe(50)
    expect(discountPercent(1990, 2990)).toBe(33)
  })

  it("não mostra desconto sem preço original ou quando ele não é maior", () => {
    expect(discountPercent(1000, null)).toBeNull()
    expect(discountPercent(1000, 1000)).toBeNull()
    expect(discountPercent(1000, 900)).toBeNull()
  })
})
