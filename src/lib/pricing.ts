/**
 * Precificação de peças impressas em 3D: custo real (material, energia, desgaste da máquina, trabalho
 * e reserva para falhas) mais a margem de lucro. Todos os valores de entrada são por peça.
 */

export type PricingInput = {
  /** Peso da peça no fatiador, com suportes (g). */
  weightGrams: number
  /** Preço do rolo de filamento (R$/kg). */
  filamentPricePerKg: number
  /** Tempo de impressão estimado pelo fatiador (h). */
  printHours: number
  /** Consumo médio da impressora (W). */
  powerWatts: number
  /** Tarifa de energia (R$/kWh). */
  energyPricePerKwh: number
  /** Valor pago na impressora (R$). */
  machinePrice: number
  /** Vida útil estimada da impressora (h). */
  machineLifeHours: number
  /** Valor de uma hora de trabalho (R$/h). */
  laborPricePerHour: number
  /** Trabalho manual por peça: preparação, acabamento e embalagem (h). */
  laborHours: number
  /** Parte das impressões que falham (%); a reserva cobre material, energia e máquina perdidos. */
  failureRatePercent: number
  /** Lucro sobre o custo, em %. */
  marginPercent: number
  /** Taxas descontadas do preço de venda (marketplace, cartão, impostos), em %. */
  saleFeePercent: number
  /** Peças iguais no lote. */
  quantity: number
}

export type PricingResult = {
  breakdown: { filament: number; energy: number; machine: number; labor: number; failures: number }
  /** Taxas de venda de uma peça, descontadas do preço. */
  saleFees: number
  /** Custo real de uma peça. */
  unitCost: number
  /** Preço sugerido de uma peça (custo + margem). */
  unitPrice: number
  unitProfit: number
  lotPrice: number
  lotProfit: number
  /** Parte do preço que é lucro (0 a 1). */
  profitShare: number
  /** Preço cobrando só o filamento com a mesma margem, para comparar. */
  filamentOnlyPrice: number
  /** Horas de impressão do lote. */
  totalPrintHours: number
  /** Peças vendidas até o desgaste cobrado mais o lucro pagarem a impressora; null sem retorno. */
  piecesToPayMachine: number | null
}

/** Números inválidos ou negativos contam como zero, para o resultado nunca quebrar enquanto se digita. */
const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)

export function calculatePrice(input: PricingInput): PricingResult {
  const hours = safe(input.printHours)
  const filament = (safe(input.weightGrams) * safe(input.filamentPricePerKg)) / 1000
  const energy = ((hours * safe(input.powerWatts)) / 1000) * safe(input.energyPricePerKwh)
  const lifeHours = safe(input.machineLifeHours)
  const machine = lifeHours > 0 ? (safe(input.machinePrice) / lifeHours) * hours : 0
  const labor = safe(input.laborPricePerHour) * safe(input.laborHours)
  // Para entregar uma peça boa com r% de falha imprime-se 1 ÷ (1 − r) vezes. Só a impressão se perde:
  // o trabalho manual (acabamento, embalagem) é feito apenas na peça que deu certo.
  const failureRate = Math.min(safe(input.failureRatePercent), 90) / 100
  const failures = ((filament + energy + machine) * failureRate) / (1 - failureRate)

  const unitCost = filament + energy + machine + labor + failures
  const marginFactor = 1 + safe(input.marginPercent) / 100
  // As taxas saem do preço final, então o preço sobe até que, descontadas, sobre o lucro pedido.
  const feeRate = Math.min(safe(input.saleFeePercent), 90) / 100
  const unitPrice = (unitCost * marginFactor) / (1 - feeRate)
  const saleFees = unitPrice * feeRate
  const unitProfit = unitPrice - unitCost - saleFees
  const quantity = Math.max(1, Math.floor(safe(input.quantity)))
  // O lote parte do preço por peça já em centavos, que é o valor que o cliente paga.
  const unitPriceCents = Math.round(unitPrice * 100) / 100
  const unitProfitCents = Math.round(unitProfit * 100) / 100

  return {
    breakdown: { filament, energy, machine, labor, failures },
    saleFees,
    unitCost,
    unitPrice,
    unitProfit,
    lotPrice: unitPriceCents * quantity,
    lotProfit: unitProfitCents * quantity,
    profitShare: unitPrice > 0 ? unitProfit / unitPrice : 0,
    filamentOnlyPrice: (filament * marginFactor) / (1 - feeRate),
    totalPrintHours: hours * quantity,
    // O desgaste já cobrado em cada peça vai para a impressora; o lucro acelera o retorno.
    piecesToPayMachine:
      machine + unitProfit > 0 ? Math.ceil(safe(input.machinePrice) / (machine + unitProfit)) : null,
  }
}
