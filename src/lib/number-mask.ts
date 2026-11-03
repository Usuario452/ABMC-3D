/**
 * Máscara de números no formato brasileiro: ponto separa milhar e vírgula separa decimais
 * ("3.500,00"). `decimals` limita as casas depois da vírgula; com zero, o número é inteiro.
 */

/** Aplica a máscara ao que foi digitado. Um ponto digitado no fim (sem vírgula ainda) vira vírgula. */
export function maskNumber(text: string, decimals: number) {
  let raw = text.replace(/[^\d.,]/g, "");
  if (decimals > 0 && !raw.includes(",") && raw.endsWith("."))
    raw = `${raw.slice(0, -1)},`;

  const comma = raw.indexOf(",");
  const intDigits = (comma === -1 ? raw : raw.slice(0, comma))
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
  const intPart = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (decimals === 0 || comma === -1) return intPart;
  const decPart = raw
    .slice(comma + 1)
    .replace(/\D/g, "")
    .slice(0, decimals);
  return `${intPart || "0"},${decPart}`;
}

/** Valor mascarado → número; vazio → NaN. */
export function parseMasked(text: string) {
  const clean = text.replace(/\./g, "").replace(",", ".").trim();
  return clean ? Number(clean) : Number.NaN;
}

/** Número → texto mascarado. `fixed` completa as casas decimais ("3.500,00"). */
export function formatMasked(value: number, decimals: number, fixed = false) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fixed ? decimals : 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Quantos dígitos há antes da posição `caret`: usado para devolver o cursor ao lugar depois da máscara. */
export function digitsBefore(text: string, caret: number) {
  return text.slice(0, caret).replace(/\D/g, "").length;
}

/** Posição logo depois do dígito número `count` (para recolocar o cursor no texto mascarado). */
export function caretAfterDigits(text: string, count: number) {
  if (count === 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index])) seen++;
    if (seen === count) return index + 1;
  }
  return text.length;
}

/** Horas → leitura por extenso curta: 1,5 → "1h 30min", 0,15 → "9min", 4 → "4h". */
export function describeDuration(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return ""
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  if (h === 0) return `${min}min`
  return min === 0 ? `${h}h` : `${h}h ${min}min`
}

/** Gramas → quilos: 12 → "0,012 kg", 1250 → "1,25 kg". */
export function describeWeight(grams: number) {
  if (!Number.isFinite(grams) || grams <= 0) return ""
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(grams / 1000)} kg`
}
