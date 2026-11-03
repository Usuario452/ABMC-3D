import { siteConfig } from "@/config/site"

const currencyFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
})

/** Formata um valor em centavos como moeda BRL (ex.: 1990 → "R$ 19,90"). */
export function formatPrice(cents: number) {
  return currencyFormatter.format(cents / 100)
}

/** Maior preço aceito pelo painel: R$ 999.999,99. */
export const MAX_PRICE_CENTS = 99_999_999

/**
 * Converte um preço digitado em reais para centavos.
 * Aceita "19,90", "19.90", "1.234,56", "1234", "R$ 19,90".
 * Retorna null para valores inválidos, negativos ou com mais de 2 casas decimais.
 */
export function parsePriceToCents(input: string): number | null {
  let value = input.replace(/R\$/gi, "").replace(/[\s ]/g, "")
  if (value === "" || !/^[\d.,]+$/.test(value)) return null

  const hasComma = value.includes(",")
  const hasDot = value.includes(".")

  if (hasComma && hasDot) {
    // Formato brasileiro: ponto como milhar, vírgula como decimal.
    if (value.lastIndexOf(",") < value.lastIndexOf(".")) return null
    if (!/^\d{1,3}(\.\d{3})*,\d{0,2}$/.test(value)) return null
    value = value.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    if (!/^\d+,\d{0,2}$/.test(value)) return null
    value = value.replace(",", ".")
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
      value = value.replace(/\./g, "")
    } else if (!/^\d+\.\d{0,2}$/.test(value)) {
      return null
    }
  }

  const [intPart, decPart = ""] = value.split(".")
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, "0") || "0")
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_PRICE_CENTS) return null
  return cents
}

/** Converte centavos para o formato de edição (ex.: 1990 → "19,90"). */
export function centsToInputValue(cents: number) {
  const [reais, centavos] = (cents / 100).toFixed(2).split(".")
  return `${reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos}`
}

/**
 * Máscara do campo de preço: os dígitos digitados são centavos, da direita para a esquerda
 * ("1" → "0,01", "1990" → "19,90", "123456" → "1.234,56"). Sem dígitos, devolve "".
 * Para no maior preço aceito.
 */
export function maskPriceInput(input: string) {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "")
  if (!digits) return ""
  return centsToInputValue(Math.min(Number(digits.slice(0, 9)), MAX_PRICE_CENTS))
}
