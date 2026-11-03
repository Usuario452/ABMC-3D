import { describe, expect, it } from "vitest";
import {
  caretAfterDigits,
  digitsBefore,
  formatMasked,
  maskNumber,
  parseMasked,
} from "@/lib/number-mask";

describe("maskNumber", () => {
  it("separa milhar com ponto", () => {
    expect(maskNumber("3500", 2)).toBe("3.500");
    expect(maskNumber("1234567", 0)).toBe("1.234.567");
  });

  it("aceita vírgula e limita as casas decimais", () => {
    expect(maskNumber("3500,456", 2)).toBe("3.500,45");
    expect(maskNumber("0,15", 2)).toBe("0,15");
    expect(maskNumber(",5", 1)).toBe("0,5");
  });

  it("trata o ponto digitado no fim como vírgula", () => {
    expect(maskNumber("0.", 2)).toBe("0,");
    expect(maskNumber("1.2", 2)).toBe("12");
  });

  it("ignora a vírgula em campos inteiros e tira letras e zeros à esquerda", () => {
    expect(maskNumber("12,5", 0)).toBe("12");
    expect(maskNumber("00a8000", 0)).toBe("8.000");
    expect(maskNumber("", 2)).toBe("");
  });

  it("remasca o que já foi mascarado", () => {
    expect(maskNumber("3.5000", 2)).toBe("35.000");
  });
});

describe("parseMasked e formatMasked", () => {
  it("converte nos dois sentidos", () => {
    expect(parseMasked("3.500,25")).toBe(3500.25);
    expect(parseMasked("8.000")).toBe(8000);
    expect(parseMasked("")).toBeNaN();
    expect(formatMasked(3500, 2, true)).toBe("3.500,00");
    expect(formatMasked(0.15, 2)).toBe("0,15");
    expect(formatMasked(8000, 0)).toBe("8.000");
  });
});

describe("cursor", () => {
  it("volta para depois do mesmo dígito", () => {
    expect(digitsBefore("3.5000", 4)).toBe(3);
    expect(caretAfterDigits("35.000", 3)).toBe(4);
    expect(caretAfterDigits("35.000", 0)).toBe(0);
  });
});

describe("leitura amigável", () => {
  it("escreve horas e minutos por extenso", async () => {
    const { describeDuration } = await import("@/lib/number-mask");
    expect(describeDuration(1.5)).toBe("1h 30min");
    expect(describeDuration(0.15)).toBe("9min");
    expect(describeDuration(4)).toBe("4h");
    expect(describeDuration(0)).toBe("");
  });

  it("converte gramas para quilos", async () => {
    const { describeWeight } = await import("@/lib/number-mask");
    expect(describeWeight(12)).toBe("0,012 kg");
    expect(describeWeight(1250)).toBe("1,25 kg");
    expect(describeWeight(Number.NaN)).toBe("");
  });
});
