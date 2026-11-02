import { siteConfig } from "@/config/site"
import { formatPrice } from "@/lib/format"

/** Número no formato internacional, somente dígitos, com DDI 55 + DDD + número. */
export const WHATSAPP_NUMBER_PATTERN = /^55\d{10,11}$/

export type WhatsAppConfig =
  | { ok: true; number: string }
  | { ok: false; reason: "ausente" | "inválido" }

export function parseWhatsAppNumber(raw: string | undefined | null): WhatsAppConfig {
  const value = raw?.trim() ?? ""
  if (!value) return { ok: false, reason: "ausente" }
  if (!WHATSAPP_NUMBER_PATTERN.test(value)) return { ok: false, reason: "inválido" }
  return { ok: true, number: value }
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return parseWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)
}

export type OrderLine = {
  name: string
  quantity: number
  unitPriceCents: number
}

export function lineSubtotal(line: OrderLine) {
  return line.unitPriceCents * line.quantity
}

export function orderTotal(lines: OrderLine[]) {
  return lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
}

/** Monta o texto do pedido enviado pelo WhatsApp. */
export function buildOrderMessage(lines: OrderLine[]) {
  const body = lines
    .map((line, index) =>
      [
        `${index + 1}. *${line.name}*`,
        `   Quantidade: ${line.quantity}`,
        `   Preço unitário: ${formatPrice(line.unitPriceCents)}`,
        `   Subtotal: ${formatPrice(lineSubtotal(line))}`,
      ].join("\n"),
    )
    .join("\n\n")

  return [
    `Olá, ${siteConfig.name}! Gostaria de fazer um pedido pelo catálogo:`,
    "",
    `*Pedido — ${siteConfig.name}*`,
    "",
    body,
    "",
    `*Total estimado: ${formatPrice(orderTotal(lines))}*`,
    "",
    "Aguardo a confirmação de disponibilidade, prazo e forma de pagamento.",
  ].join("\n")
}

export function buildWhatsAppUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/** Link genérico de contato (sem pedido), ou null se o número não estiver configurado. */
export function getWhatsAppContactUrl() {
  const config = getWhatsAppConfig()
  if (!config.ok) return null
  return buildWhatsAppUrl(config.number, `Olá, ${siteConfig.name}! Vim pelo site e gostaria de mais informações.`)
}
