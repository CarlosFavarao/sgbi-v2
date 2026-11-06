import { describe, expect, it } from "vitest";
import { diferencaPp, percentual, variacao } from "./calc";

describe("percentual", () => {
  it("calcula a / b × 100", () => {
    expect(percentual(25, 100)).toBe(25);
    expect(percentual(150, 100)).toBe(150);
  });

  it("devolve null quando o divisor é zero", () => {
    expect(percentual(10, 0)).toBeNull();
  });

  it("aceita numerador zero e negativo", () => {
    expect(percentual(0, 50)).toBe(0);
    expect(percentual(-10, 100)).toBe(-10);
  });
});

describe("variacao", () => {
  it("calcula a variação % sobre o anterior", () => {
    expect(variacao(100, 80)).toBeCloseTo(25);
    expect(variacao(60, 80)).toBeCloseTo(-25);
  });

  it("devolve null sem atual, sem anterior ou com anterior zero", () => {
    expect(variacao(null, 80)).toBeNull();
    expect(variacao(100, null)).toBeNull();
    expect(variacao(100, 0)).toBeNull();
  });

  it("usa o módulo do anterior: de -100 para -50 é melhora de 50%", () => {
    expect(variacao(-50, -100)).toBeCloseTo(50);
    expect(variacao(-150, -100)).toBeCloseTo(-50);
  });

  it("atual zero é queda de 100%", () => {
    expect(variacao(0, 80)).toBe(-100);
  });
});

describe("diferencaPp", () => {
  it("subtrai em pontos percentuais", () => {
    expect(diferencaPp(30, 25)).toBe(5);
    expect(diferencaPp(20, 25)).toBe(-5);
  });

  it("devolve null se faltar um dos lados, mas aceita zero", () => {
    expect(diferencaPp(null, 25)).toBeNull();
    expect(diferencaPp(25, null)).toBeNull();
    expect(diferencaPp(0, 5)).toBe(-5);
  });
});
