import { describe, expect, it } from "vitest";
import { metaDiariaDoNivel, metaNivelNoPeriodo, somaMetaDiaria, type MetaMensal } from "./metas";

describe("somaMetaDiaria", () => {
  const metas = [
    { data: "2026-11-01", meta: 100, metaLucro: 30 },
    { data: "2026-11-02", meta: 200, metaLucro: 50 },
    { data: "2026-11-09", meta: 999, metaLucro: 99 },
  ];

  it("soma meta e meta de lucro dos dias do período", () => {
    expect(somaMetaDiaria(metas, { inicio: "2026-11-01", fim: "2026-11-02" })).toEqual({ meta: 300, metaLucro: 80 });
  });

  it("null quando nenhum dia do período tem meta, ou o período é null", () => {
    expect(somaMetaDiaria(metas, { inicio: "2026-12-01", fim: "2026-12-31" })).toBeNull();
    expect(somaMetaDiaria(metas, null)).toBeNull();
  });
});

describe("metaNivelNoPeriodo (meta mensal ÷ dias do mês × dias do intervalo, P33)", () => {
  const mensais: MetaMensal[] = [{ codigo: 1, mes: "2026-11", meta: 3000, metaLucro: 600 }];

  it("fração proporcional aos dias corridos do mês", () => {
    const r = metaNivelNoPeriodo(mensais, { inicio: "2026-11-01", fim: "2026-11-10" });
    expect(r!.meta).toBeCloseTo(1000);
    expect(r!.metaLucro).toBeCloseTo(200);
  });

  it("mês inteiro devolve a meta mensal", () => {
    const r = metaNivelNoPeriodo(mensais, { inicio: "2026-11-01", fim: "2026-11-30" });
    expect(r!.meta).toBeCloseTo(3000);
  });

  it("período que cruza meses usa só a parte do mês que tem meta", () => {
    const r = metaNivelNoPeriodo(mensais, { inicio: "2026-10-25", fim: "2026-11-05" });
    expect(r!.meta).toBeCloseTo(500); // 5 de 30 dias de novembro
  });

  it("soma metas de vários meses", () => {
    const duas: MetaMensal[] = [
      { codigo: 1, mes: "2026-10", meta: 3100, metaLucro: 0 },
      { codigo: 1, mes: "2026-11", meta: 3000, metaLucro: 0 },
    ];
    const r = metaNivelNoPeriodo(duas, { inicio: "2026-10-01", fim: "2026-11-30" });
    expect(r!.meta).toBeCloseTo(6100);
  });

  it("null quando nenhum mês do período tem meta, ou o período é null", () => {
    expect(metaNivelNoPeriodo(mensais, { inicio: "2026-12-01", fim: "2026-12-10" })).toBeNull();
    expect(metaNivelNoPeriodo(mensais, null)).toBeNull();
    expect(metaNivelNoPeriodo([], { inicio: "2026-11-01", fim: "2026-11-10" })).toBeNull();
  });
});

describe("metaDiariaDoNivel (meta mensal dividida igualmente pelos dias do mês, D28)", () => {
  it("gera um dia para cada dia do mês, com a mesma meta", () => {
    const dias = metaDiariaDoNivel([{ codigo: 1, mes: "2026-02", meta: 2800, metaLucro: 560 }]);
    expect(dias).toHaveLength(28);
    expect(dias[0]).toEqual({ data: "2026-02-01", meta: 100, metaLucro: 20 });
    expect(dias[27].data).toBe("2026-02-28");
  });

  it("fevereiro bissexto tem 29 dias", () => {
    expect(metaDiariaDoNivel([{ codigo: 1, mes: "2024-02", meta: 2900, metaLucro: 0 }])).toHaveLength(29);
  });

  it("soma os códigos do mesmo mês (vários departamentos) antes de dividir", () => {
    const dias = metaDiariaDoNivel([
      { codigo: 1, mes: "2026-11", meta: 3000, metaLucro: 0 },
      { codigo: 2, mes: "2026-11", meta: 3000, metaLucro: 0 },
    ]);
    expect(dias).toHaveLength(30);
    expect(dias[0].meta).toBe(200);
  });

  it("vários meses saem ordenados por data e a soma diária fecha com a meta mensal", () => {
    const dias = metaDiariaDoNivel([
      { codigo: 1, mes: "2026-12", meta: 3100, metaLucro: 0 },
      { codigo: 1, mes: "2026-11", meta: 3000, metaLucro: 0 },
    ]);
    expect(dias[0].data).toBe("2026-11-01");
    expect(dias.at(-1)!.data).toBe("2026-12-31");
    const nov = dias.filter((d) => d.data.startsWith("2026-11")).reduce((t, d) => t + d.meta, 0);
    expect(nov).toBeCloseTo(3000);
  });

  it("sem metas devolve lista vazia", () => {
    expect(metaDiariaDoNivel([])).toEqual([]);
  });
});
