import { describe, expect, it } from "vitest"
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  orderTotal,
  parseWhatsAppNumber,
} from "@/lib/whatsapp"

const lines = [
  { name: "Vaso Geométrico", quantity: 2, unitPriceCents: 4990 },
  { name: "Luminária Lua", quantity: 1, unitPriceCents: 12900 },
]

describe("parseWhatsAppNumber", () => {
  it("aceita número internacional brasileiro só com dígitos", () => {
    expect(parseWhatsAppNumber("5511999999999")).toEqual({ ok: true, number: "5511999999999" })
    expect(parseWhatsAppNumber("551133334444")).toEqual({ ok: true, number: "551133334444" })
  })

  it("indica ausência ou formato inválido", () => {
    expect(parseWhatsAppNumber(undefined)).toEqual({ ok: false, reason: "ausente" })
    expect(parseWhatsAppNumber("  ")).toEqual({ ok: false, reason: "ausente" })
    expect(parseWhatsAppNumber("+55 11 99999-9999")).toEqual({ ok: false, reason: "inválido" })
    expect(parseWhatsAppNumber("11999999999")).toEqual({ ok: false, reason: "inválido" })
  })
})

describe("buildOrderMessage", () => {
  const message = buildOrderMessage(lines).replace(/ /g, " ")

  it("identifica a KuboStudio", () => {
    expect(message).toContain("KuboStudio")
  })

  it("lista nome, quantidade, preço unitário e subtotal de cada item", () => {
    expect(message).toContain("1. *Vaso Geométrico*")
    expect(message).toContain("Quantidade: 2")
    expect(message).toContain("Preço unitário: R$ 49,90")
    expect(message).toContain("Subtotal: R$ 99,80")
    expect(message).toContain("2. *Luminária Lua*")
    expect(message).toContain("Subtotal: R$ 129,00")
  })

  it("informa o total", () => {
    expect(orderTotal(lines)).toBe(22880)
    expect(message).toContain("Total: R$ 228,80")
  })
})

describe("buildWhatsAppUrl", () => {
  it("codifica a mensagem para a URL do wa.me", () => {
    const url = buildWhatsAppUrl("5511999999999", "Olá & tchau\nlinha 2")
    expect(url).toBe("https://wa.me/5511999999999?text=Ol%C3%A1%20%26%20tchau%0Alinha%202")
    expect(decodeURIComponent(new URL(url).searchParams.get("text") ?? "")).toBe("Olá & tchau\nlinha 2")
  })
})
