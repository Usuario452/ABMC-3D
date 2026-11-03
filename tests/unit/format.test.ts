import { describe, expect, it } from "vitest"
import { centsToInputValue, formatPrice, maskPriceInput, parsePriceToCents } from "@/lib/format"
import { slugify } from "@/lib/slug"

const normalize = (value: string) => value.replace(/ /g, " ")

describe("formatPrice", () => {
  it("formata centavos em BRL (pt-BR)", () => {
    expect(normalize(formatPrice(1990))).toBe("R$ 19,90")
    expect(normalize(formatPrice(0))).toBe("R$ 0,00")
    expect(normalize(formatPrice(123456789))).toBe("R$ 1.234.567,89")
  })
})

describe("parsePriceToCents", () => {
  it.each([
    ["19,90", 1990],
    ["19.90", 1990],
    ["19,9", 1990],
    ["19", 1900],
    ["0", 0],
    ["1.234,56", 123456],
    ["1.234", 123400],
    ["R$ 49,90", 4990],
    [" 10,00 ", 1000],
    ["10,", 1000],
  ])("converte %s → %i", (input, expected) => {
    expect(parsePriceToCents(input)).toBe(expected)
  })

  it.each(["", "abc", "-10", "10,999", "1,234.56", "1.23.4", "999999999"])("rejeita %s", (input) => {
    expect(parsePriceToCents(input)).toBeNull()
  })

  it("é o inverso de centsToInputValue", () => {
    for (const cents of [0, 1, 99, 1990, 123456, 99_999_999]) {
      expect(parsePriceToCents(centsToInputValue(cents))).toBe(cents)
    }
  })
})

describe("maskPriceInput", () => {
  it("trata os dígitos como centavos e separa os milhares", () => {
    expect(maskPriceInput("1")).toBe("0,01")
    expect(maskPriceInput("1990")).toBe("19,90")
    expect(maskPriceInput("123456")).toBe("1.234,56")
    expect(maskPriceInput("R$ 100,10")).toBe("100,10")
    expect(maskPriceInput("100,105")).toBe("1.001,05")
  })

  it("limpa o campo sem dígitos e para no preço máximo", () => {
    expect(maskPriceInput("")).toBe("")
    expect(maskPriceInput("0,00")).toBe("")
    expect(maskPriceInput("9999999999")).toBe("999.999,99")
  })
})

describe("slugify", () => {
  it("remove acentos, símbolos e espaços", () => {
    expect(slugify("Vaso Geométrico Ç & Cia!")).toBe("vaso-geometrico-c-e-cia")
    expect(slugify("  --Luminária  3D--  ")).toBe("luminaria-3d")
  })

  it("respeita o tamanho máximo sem terminar em hífen", () => {
    const slug = slugify("a".repeat(10) + " " + "b".repeat(10), 11)
    expect(slug).toBe("aaaaaaaaaa")
  })
})
