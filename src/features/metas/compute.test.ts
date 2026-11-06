import { describe, expect, it } from "vitest";
import { curvaCumprimento, projecao, resumirMeta, somaRealizado, statusMargem, statusMeta } from "./compute";

const P = (inicio: string, fim: string) => ({ inicio, fim });

describe("somaRealizado", () => {
  const dias = [
    { data: "2026-11-01", venda: 100, custo: 60 },
    { data: "2026-11-02", venda: 200, custo: 120 },
    { data: "2026-11-10", venda: 999, custo: 1 },
  ];

  it("soma venda e custo só dos dias dentro do período (pontas inclusas)", () => {
    expect(somaRealizado(dias, P("2026-11-01", "2026-11-02"))).toEqual({ venda: 300, custo: 180 });
  });

  it("null quando não há nenhum dia com carga no período ou o período é null", () => {
    expect(somaRealizado(dias, P("2026-12-01", "2026-12-05"))).toBeNull();
    expect(somaRealizado(dias, null)).toBeNull();
  });

  it("dia com venda zero conta como carga (não é null)", () => {
    expect(somaRealizado([{ data: "2026-11-01", venda: 0, custo: 0 }], P("2026-11-01", "2026-11-01"))).toEqual({
      venda: 0,
      custo: 0,
    });
  });
});

describe("statusMeta (acima ≥ 100% do ritmo, no ritmo ≥ 95%)", () => {
  const decorrido = P("2026-11-01", "2026-11-10");

  it.each([
    [100, "acima"],
    [120, "acima"],
    [99.99, "no-ritmo"],
    [95, "no-ritmo"],
    [94.99, "abaixo"],
    [0, "abaixo"],
  ])("realizado %s sobre meta esperada 100 → %s", (realizado, esperado) => {
    expect(statusMeta(realizado, 100, decorrido)).toBe(esperado);
  });

  it("período que ainda não começou fica aguardando, antes de qualquer outra regra", () => {
    expect(statusMeta(50, 100, null)).toBe("aguardando");
    expect(statusMeta(50, null, null)).toBe("aguardando");
  });

  it("sem meta esperada (null ou 0) é sem-meta", () => {
    expect(statusMeta(50, null, decorrido)).toBe("sem-meta");
    expect(statusMeta(50, 0, decorrido)).toBe("sem-meta");
  });
});

describe("projecao", () => {
  const periodo = P("2026-11-01", "2026-11-30");
  const decorrido = P("2026-11-01", "2026-11-10");

  it("com meta, mantém o ritmo sobre a curva da meta", () => {
    // Realizou 90 de 100 esperados; meta do mês 300 → projeta 270.
    expect(projecao(90, 300, 100, periodo, decorrido)).toBeCloseTo(270);
  });

  it("sem meta, usa a média diária × dias do período", () => {
    // 100 em 10 dias → 10/dia × 30 dias.
    expect(projecao(100, null, null, periodo, decorrido)).toBeCloseTo(300);
  });

  it("meta cadastrada mas sem meta esperada também cai na média diária", () => {
    expect(projecao(100, 500, null, periodo, decorrido)).toBeCloseTo(300);
  });

  it("período não iniciado não tem projeção", () => {
    expect(projecao(0, 300, 0, periodo, null)).toBeNull();
  });
});

describe("statusMargem (ok até 0,5 p.p. abaixo da meta, atenção até 2 p.p.)", () => {
  it.each([
    [30, 30, "ok"],
    [35, 30, "ok"],
    [29.5, 30, "ok"],
    [29.49, 30, "atencao"],
    [28, 30, "atencao"],
    [27.99, 30, "critico"],
  ])("margem %s contra meta %s → %s", (margem, meta, esperado) => {
    expect(statusMargem(margem, meta)).toBe(esperado);
  });

  it("sem margem ou sem meta de margem é sem-meta", () => {
    expect(statusMargem(null, 30)).toBe("sem-meta");
    expect(statusMargem(30, null)).toBe("sem-meta");
  });
});

describe("resumirMeta", () => {
  const periodo = P("2026-11-01", "2026-11-30");
  const decorrido = P("2026-11-01", "2026-11-10");

  it("calcula atingimento, diferença, projeção, margem e status", () => {
    const r = resumirMeta({
      meta: { meta: 1000, metaLucro: 300 },
      metaEsperada: 400,
      venda: 400,
      custo: 300,
      periodo,
      decorrido,
    });
    expect(r.atingimento).toBe(40);
    expect(r.diferenca).toBe(-600);
    expect(r.projecao).toBeCloseTo(1000);
    expect(r.projecaoSobreMeta).toBeCloseTo(100);
    expect(r.status).toBe("acima");
    expect(r.margem).toBe(25);
    expect(r.metaMargem).toBe(30);
    expect(r.diferencaMargem).toBe(-5);
    expect(r.statusMargem).toBe("critico");
  });

  it("sem meta cadastrada: atingimento, diferença e margem da meta ficam null", () => {
    const r = resumirMeta({ meta: null, metaEsperada: null, venda: 100, custo: 50, periodo, decorrido });
    expect(r.meta).toBeNull();
    expect(r.atingimento).toBeNull();
    expect(r.diferenca).toBeNull();
    expect(r.projecaoSobreMeta).toBeNull();
    expect(r.status).toBe("sem-meta");
    expect(r.statusMargem).toBe("sem-meta");
    expect(r.projecao).toBeCloseTo(300); // média diária
  });

  it("meta com valor zero é tratada como sem meta", () => {
    const r = resumirMeta({ meta: { meta: 0, metaLucro: 0 }, metaEsperada: 0, venda: 10, custo: 5, periodo, decorrido });
    expect(r.meta).toBeNull();
    expect(r.atingimento).toBeNull();
  });

  it("período que não começou: sem projeção e sem margem, status aguardando", () => {
    const r = resumirMeta({
      meta: { meta: 1000, metaLucro: 300 },
      metaEsperada: null,
      venda: 0,
      custo: 0,
      periodo,
      decorrido: null,
    });
    expect(r.status).toBe("aguardando");
    expect(r.projecao).toBeNull();
    expect(r.margem).toBeNull();
  });
});

describe("curvaCumprimento", () => {
  const mes = P("2026-11-01", "2026-11-05");
  const metas = ["01", "02", "03", "04", "05"].map((d) => ({ data: `2026-11-${d}`, meta: 100, metaLucro: 30 }));
  const realizados = [
    { data: "2026-11-01", venda: 100, custo: 70 },
    { data: "2026-11-02", venda: 50, custo: 35 },
    { data: "2026-11-04", venda: 9999, custo: 0 }, // depois da referência: não conta
  ];

  it("meta acumulada no mês inteiro; realizado acumulado só até a referência", () => {
    const c = curvaCumprimento(mes, "2026-11-02", metas, realizados);
    expect(c.map((p) => p.meta)).toEqual([100, 200, 300, 400, 500]);
    expect(c.map((p) => p.realizado)).toEqual([100, 150, null, null, null]);
  });

  it("projeção começa na referência (sem buraco) e segue o ritmo da meta", () => {
    const c = curvaCumprimento(mes, "2026-11-02", metas, realizados);
    // Ritmo: 150 realizados de 200 esperados = 75%.
    expect(c.map((p) => p.projecao)).toEqual([null, 150, 225, 300, 375]);
  });

  it("sem meta, a meta fica null e a projeção usa a média diária", () => {
    const c = curvaCumprimento(mes, "2026-11-02", [], realizados);
    expect(c.every((p) => p.meta === null)).toBe(true);
    // Média: 150 em 2 dias = 75/dia.
    expect(c.map((p) => p.projecao)).toEqual([null, 150, 225, 300, 375]);
  });

  it("referência antes do mês: sem realizado e sem projeção", () => {
    const c = curvaCumprimento(mes, "2026-10-31", metas, realizados);
    expect(c.every((p) => p.realizado === null && p.projecao === null)).toBe(true);
    expect(c[4].meta).toBe(500);
  });

  it("referência no último dia: projeção termina igual ao realizado", () => {
    const c = curvaCumprimento(mes, "2026-11-05", metas, realizados);
    expect(c[4].projecao).toBe(c[4].realizado);
  });
});
