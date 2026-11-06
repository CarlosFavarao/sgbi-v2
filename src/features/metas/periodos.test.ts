import { describe, expect, it } from "vitest";
import { dataReferencia, periodosDaReferencia } from "./periodos";

describe("dataReferencia", () => {
  it("é o último dia carregado quando cai dentro do mês", () => {
    expect(dataReferencia("2026-11", "2026-11-05")).toBe("2026-11-05");
  });

  it("mês já encerrado usa o último dia do mês", () => {
    expect(dataReferencia("2026-10", "2026-11-05")).toBe("2026-10-31");
    expect(dataReferencia("2024-02", "2026-11-05")).toBe("2024-02-29");
  });

  it("mês futuro devolve a data máxima, antes do mês (período aguardando)", () => {
    expect(dataReferencia("2026-12", "2026-11-05")).toBe("2026-11-05");
  });
});

describe("periodosDaReferencia (referência quinta, 05/11/2026)", () => {
  const abas = periodosDaReferencia("2026-11", "2026-11-05");
  const aba = (id: string) => abas.find((a) => a.id === id)!;

  it("tem as seis abas na ordem", () => {
    expect(abas.map((a) => a.id)).toEqual(["dia", "semana", "quinzena1", "quinzena2", "mes", "ano"]);
  });

  it("dia: o próprio dia, comparado com o mesmo dia da semana anterior", () => {
    expect(aba("dia").periodo).toEqual({ inicio: "2026-11-05", fim: "2026-11-05" });
    expect(aba("dia").comparacao).toEqual({ inicio: "2026-10-29", fim: "2026-10-29" });
  });

  it("semana: segunda a domingo, realizado até a referência", () => {
    expect(aba("semana").periodo).toEqual({ inicio: "2026-11-02", fim: "2026-11-08" });
    expect(aba("semana").decorrido).toEqual({ inicio: "2026-11-02", fim: "2026-11-05" });
    expect(aba("semana").comparacao).toEqual({ inicio: "2026-10-26", fim: "2026-10-29" });
    expect(aba("semana").periodoComparacao).toEqual({ inicio: "2026-10-26", fim: "2026-11-01" });
  });

  it("1ª quinzena: dias 1 a 15; a meta é do período inteiro, o realizado até a referência", () => {
    expect(aba("quinzena1").periodo).toEqual({ inicio: "2026-11-01", fim: "2026-11-15" });
    expect(aba("quinzena1").decorrido).toEqual({ inicio: "2026-11-01", fim: "2026-11-05" });
    expect(aba("quinzena1").comparacao).toEqual({ inicio: "2026-10-01", fim: "2026-10-05" });
  });

  it("2ª quinzena ainda não começou: sem decorrido e sem comparação", () => {
    expect(aba("quinzena2").periodo).toEqual({ inicio: "2026-11-16", fim: "2026-11-30" });
    expect(aba("quinzena2").decorrido).toBeNull();
    expect(aba("quinzena2").comparacao).toBeNull();
    expect(aba("quinzena2").periodoComparacao).not.toBeNull();
  });

  it("mês: contra o mês anterior inteiro (meta) e a mesma parte (realizado)", () => {
    expect(aba("mes").periodo).toEqual({ inicio: "2026-11-01", fim: "2026-11-30" });
    expect(aba("mes").periodoComparacao).toEqual({ inicio: "2026-10-01", fim: "2026-10-31" });
    expect(aba("mes").comparacao).toEqual({ inicio: "2026-10-01", fim: "2026-10-05" });
  });

  it("ano: do 1º de janeiro a 31 de dezembro, contra o ano anterior", () => {
    expect(aba("ano").periodo).toEqual({ inicio: "2026-01-01", fim: "2026-12-31" });
    expect(aba("ano").descricao).toBe("2026");
    expect(aba("ano").decorrido).toEqual({ inicio: "2026-01-01", fim: "2026-11-05" });
    expect(aba("ano").periodoComparacao).toEqual({ inicio: "2025-01-01", fim: "2025-12-31" });
    expect(aba("ano").comparacao).toEqual({ inicio: "2025-01-01", fim: "2025-11-05" });
  });

  it("mês encerrado: todas as abas têm realizado completo", () => {
    const fechado = periodosDaReferencia("2026-10", "2026-10-31");
    expect(fechado.find((a) => a.id === "mes")!.decorrido).toEqual({ inicio: "2026-10-01", fim: "2026-10-31" });
    expect(fechado.find((a) => a.id === "quinzena2")!.decorrido).toEqual({ inicio: "2026-10-16", fim: "2026-10-31" });
  });

  it("mês sem dados ainda: o dia é o 1º do mês e nenhuma aba tem realizado", () => {
    const futuro = periodosDaReferencia("2026-12", "2026-11-05");
    expect(futuro.find((a) => a.id === "dia")!.periodo).toEqual({ inicio: "2026-12-01", fim: "2026-12-01" });
    expect(futuro.find((a) => a.id === "mes")!.decorrido).toBeNull();
  });
});
