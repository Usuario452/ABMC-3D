import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "@/lib/auth/password"

describe("hash de senha", () => {
  it("gera hashes diferentes para a mesma senha e valida só a senha correta", async () => {
    const first = await hashPassword("senha-forte-de-teste")
    const second = await hashPassword("senha-forte-de-teste")

    expect(first).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[\w-]+\$[\w-]+$/)
    expect(first).not.toBe(second)
    expect(await verifyPassword("senha-forte-de-teste", first)).toBe(true)
    expect(await verifyPassword("senha-errada", first)).toBe(false)
  })

  it("rejeita hashes malformados sem lançar exceção", async () => {
    expect(await verifyPassword("x", "")).toBe(false)
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false)
    expect(await verifyPassword("x", "scrypt$0$8$1$c2FsdA$aGFzaA")).toBe(false)
  })
})
