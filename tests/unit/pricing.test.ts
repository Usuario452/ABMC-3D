import { describe, expect, it } from "vitest"
import { calculatePrice, type PricingInput } from "@/lib/pricing"

const base: PricingInput = {
  weightGrams: 12,
  filamentPricePerKg: 120,
  printHours: 1,
  powerWatts: 250,
  energyPricePerKwh: 1,
  machinePrice: 3500,
  machineLifeHours: 8000,
  laborPricePerHour: 25,
  laborHours: 0.15,
  failureRatePercent: 5,
  marginPercent: 120,
  saleFeePercent: 0,
  quantity: 1,
}

const round = (value: number) => Math.round(value * 100) / 100

describe("calculatePrice", () => {
  it("soma material, energia, máquina, trabalho e falhas e aplica a margem", () => {
    const result = calculatePrice(base)
    expect(round(result.breakdown.filament)).toBe(1.44)
    expect(round(result.breakdown.energy)).toBe(0.25)
    expect(round(result.breakdown.machine)).toBe(0.44)
    expect(round(result.breakdown.labor)).toBe(3.75)
    expect(round(result.breakdown.failures)).toBe(0.11)
    expect(round(result.unitCost)).toBe(5.99)
    expect(round(result.unitPrice)).toBe(13.18)
    expect(round(result.unitProfit)).toBe(7.19)
    expect(round(result.filamentOnlyPrice)).toBe(3.17)
    expect(Math.round(result.profitShare * 100)).toBe(55)
    expect(result.piecesToPayMachine).toBe(460)
  })

  it("reserva de falhas: imprime 1 ÷ (1 − risco) vezes e não perde o trabalho manual", () => {
    // 20% de falha: 1,44 + 0,25 + 0,4375 = 2,1275 de impressão; reserva = 2,1275 × 0,2 ÷ 0,8.
    const result = calculatePrice({ ...base, failureRatePercent: 20 })
    expect(round(result.breakdown.failures)).toBe(0.53)
    const noLabor = calculatePrice({ ...base, failureRatePercent: 20, laborHours: 0 })
    expect(noLabor.breakdown.failures).toBeCloseTo(result.breakdown.failures, 10)
  })

  it("taxa de venda sobe o preço e mantém o lucro pedido depois do desconto", () => {
    const semTaxa = calculatePrice(base)
    const result = calculatePrice({ ...base, saleFeePercent: 20 })
    // 13,18 ÷ 0,8 = 16,47; 20% disso fica com o marketplace.
    expect(round(result.unitPrice)).toBe(16.47)
    expect(round(result.saleFees)).toBe(3.29)
    expect(result.unitProfit).toBeCloseTo(semTaxa.unitProfit, 10)
    expect(result.unitCost).toBeCloseTo(semTaxa.unitCost, 10)
  })

  it("multiplica o lote e as horas pela quantidade, mantendo os valores por peça", () => {
    const result = calculatePrice({ ...base, quantity: 10 })
    expect(round(result.unitPrice)).toBe(13.18)
    expect(round(result.lotPrice)).toBe(131.8)
    expect(result.totalPrintHours).toBe(10)
  })

  it("não quebra com campos vazios, negativos ou vida útil zero", () => {
    const result = calculatePrice({ ...base, weightGrams: Number.NaN, machineLifeHours: 0, quantity: -3, marginPercent: 0 })
    expect(result.breakdown.filament).toBe(0)
    expect(result.breakdown.machine).toBe(0)
    expect(result.lotPrice).toBe(Math.round(result.unitPrice * 100) / 100)
    expect(result.piecesToPayMachine).toBeNull()
  })
})
