import { describe, expect, it } from "vitest";
import {
  alertas,
  calcularLinha,
  combinarSeries,
  indicadores,
  margemDoIntervalo,
  serieDiaria,
  situacao,
  totais,
  vendaDoIntervalo,
} from "./compute";
import type { Dia, LinhaNivel } from "./types";

const dia = (data: string, parcial: Partial<Dia> = {}): Dia => ({
  data,
  venda: null,
  custo: null,
  compra: null,
  vendaPdv: null,
  tickets: null,
  cancelamentos: null,
  despesas: null,
  ...parcial,
});

describe("combinarSeries", () => {
  const periodo = { inicio: "2026-11-01", fim: "2026-11-03" };
  const anterior = { inicio: "2026-10-29", fim: "2026-10-31" };

  it("gera um dia para cada data do período, com null onde não há carga", () => {
    const r = combinarSeries(periodo, anterior, [{ atual: [{ data: "2026-11-02", venda: 10 }], anterior: [] }]);
    expect(r.atual.dias.map((d) => d.data)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(r.atual.dias[0].venda).toBeNull();
    expect(r.atual.dias[1].venda).toBe(10);
    expect(r.anterior.dias).toHaveLength(3);
  });

  it("junta fontes diferentes no mesmo dia", () => {
    const r = combinarSeries(periodo, anterior, [
      { atual: [{ data: "2026-11-01", venda: 100, custo: 60 }], anterior: [] },
      { atual: [{ data: "2026-11-01", tickets: 5, vendaPdv: 90 }], anterior: [] },
    ]);
    expect(r.atual.dias[0]).toMatchObject({ venda: 100, custo: 60, tickets: 5, vendaPdv: 90 });
  });

  it("fontes ainda não carregadas (undefined) deixam os campos null", () => {
    const r = combinarSeries(periodo, anterior, [undefined, undefined]);
    expect(r.atual.dias.every((d) => d.venda === null && d.tickets === null)).toBe(true);
  });

  it("zero vindo da fonte é diferente de sem carga", () => {
    const r = combinarSeries(periodo, anterior, [{ atual: [{ data: "2026-11-01", venda: 0 }], anterior: [] }]);
    expect(r.atual.dias[0].venda).toBe(0);
  });
});

describe("totais", () => {
  it("soma só os dias com carga e conta a cobertura de cada campo", () => {
    const t = totais([dia("d1", { venda: 100 }), dia("d2"), dia("d3", { venda: 50, custo: 30 })]);
    expect(t.venda).toBe(150);
    expect(t.cobertura.venda).toBe(2);
    expect(t.custo).toBe(30);
    expect(t.cobertura.custo).toBe(1);
    expect(t.cobertura.despesas).toBe(0);
  });
});

describe("indicadores", () => {
  const dias = [
    dia("d1", { venda: 1000, custo: 700, compra: 400, vendaPdv: 800, tickets: 40, cancelamentos: 16, despesas: 100 }),
    dia("d2", { venda: 1000, custo: 800, compra: 600, vendaPdv: 1200, tickets: 60, cancelamentos: 24, despesas: 100 }),
  ];

  it("calcula lucro, margem, resultado e relações sobre a venda", () => {
    const i = indicadores(dias);
    expect(i.venda).toBe(2000);
    expect(i.lucro).toBe(500);
    expect(i.margem).toBe(25);
    expect(i.compraSobreVenda).toBe(50);
    expect(i.despesasSobreVenda).toBe(10);
    expect(i.resultado).toBe(300);
    expect(i.resultadoSobreVenda).toBe(15);
  });

  it("ticket médio e cancelamentos usam a base PDV, não a venda total", () => {
    const i = indicadores(dias);
    expect(i.ticketMedio).toBe(20); // 2000 de vendaPdv ÷ 100 tickets
    expect(i.cancelamentosSobreVenda).toBe(2); // 40 ÷ 2000 vendaPdv
  });

  it("sem venda: margem e razões ficam null (nunca NaN ou Infinity)", () => {
    const i = indicadores([dia("d1"), dia("d2")]);
    expect(i.venda).toBe(0);
    expect(i.margem).toBeNull();
    expect(i.compraSobreVenda).toBeNull();
    expect(i.ticketMedio).toBeNull();
    expect(i.cancelamentosSobreVenda).toBeNull();
    expect(i.despesasSobreVenda).toBeNull();
    expect(i.cobertura.venda).toBe(0);
  });

  it("lista vazia não quebra", () => {
    expect(indicadores([]).venda).toBe(0);
  });
});

describe("serieDiaria e medidas do intervalo", () => {
  const dias = [dia("d1", { venda: 100, custo: 80 }), dia("d2"), dia("d3", { venda: 200, custo: 100 })];

  it("dia sem a base do indicador fica null (sparkline com buraco)", () => {
    const s = serieDiaria(dias, (i) => i.margem, "venda");
    expect(s).toEqual([
      { data: "d1", valor: 20 },
      { data: "d2", valor: null },
      { data: "d3", valor: 50 },
    ]);
  });

  it("vendaDoIntervalo e margemDoIntervalo: null sem nenhum dia com venda", () => {
    expect(vendaDoIntervalo(dias)).toBe(300);
    expect(margemDoIntervalo(dias)).toBeCloseTo(40);
    expect(vendaDoIntervalo([dia("d1")])).toBeNull();
    expect(margemDoIntervalo([dia("d1")])).toBeNull();
  });
});

describe("situacao (limites provisórios: bom até 2 p.p., atenção até 6 p.p.)", () => {
  it.each([
    [null, null],
    [0, "bom"],
    [2, "bom"],
    [2.01, "atencao"],
    [6, "atencao"],
    [6.01, "critico"],
    [-2, "bom"],
    [-6, "atencao"],
    [-6.01, "critico"],
  ])("variação %s p.p. → %s", (pp, esperado) => {
    expect(situacao(pp)).toBe(esperado);
  });
});

describe("calcularLinha", () => {
  const linha: LinhaNivel = {
    codigo: 1,
    descricao: "Mercearia",
    compra: 50,
    venda: 100,
    compraAnterior: 10,
    vendaAnterior: 100,
  };

  it("calcula compra sobre venda, variações e situação", () => {
    const r = calcularLinha(linha);
    expect(r.compraSobreVenda).toBe(50);
    expect(r.compraSobreVendaAnterior).toBe(10);
    expect(r.variacaoPp).toBe(40);
    expect(r.variacaoCompra).toBe(400);
    expect(r.variacaoVenda).toBe(0);
    expect(r.situacao).toBe("critico");
  });

  it("sem venda no período anterior não há comparação nem situação", () => {
    const r = calcularLinha({ ...linha, vendaAnterior: 0, compraAnterior: 0 });
    expect(r.compraSobreVendaAnterior).toBeNull();
    expect(r.variacaoPp).toBeNull();
    expect(r.situacao).toBeNull();
  });
});

describe("alertas", () => {
  const base = [dia("d1", { venda: 1000, custo: 700, vendaPdv: 1000, cancelamentos: 100, despesas: 100 })];
  const sem = calcularLinha({ codigo: 9, descricao: "Estável", compra: 10, venda: 100, compraAnterior: 10, vendaAnterior: 100 });

  it("períodos iguais não geram alerta", () => {
    expect(alertas(indicadores(base), indicadores(base), [sem])).toEqual([]);
  });

  it("queda de margem de 0,5 p.p. ou mais gera alerta", () => {
    const pior = [dia("d1", { ...base[0], custo: 800 })]; // 20% contra 30%
    const r = alertas(indicadores(pior), indicadores(base), []);
    expect(r.map((a) => a.id)).toContain("margem");
  });

  it("queda de margem menor que 0,5 p.p. não gera alerta", () => {
    const quase = [dia("d1", { ...base[0], custo: 703 })]; // 29,7% contra 30%
    expect(alertas(indicadores(quase), indicadores(base), []).map((a) => a.id)).not.toContain("margem");
  });

  it("aumento das despesas sobre a venda gera alerta, só se os dois períodos têm despesa carregada", () => {
    const mais = [dia("d1", { ...base[0], despesas: 200 })];
    expect(alertas(indicadores(mais), indicadores(base), []).map((a) => a.id)).toContain("despesas");

    const semCarga = [dia("d1", { ...base[0], despesas: null })];
    expect(alertas(indicadores(mais), indicadores(semCarga), []).map((a) => a.id)).not.toContain("despesas");
  });

  it("cancelamentos 10% maiores geram alerta; 9% não", () => {
    const dez = [dia("d1", { ...base[0], cancelamentos: 110 })];
    const nove = [dia("d1", { ...base[0], cancelamentos: 109 })];
    expect(alertas(indicadores(dez), indicadores(base), []).map((a) => a.id)).toContain("cancelamentos");
    expect(alertas(indicadores(nove), indicadores(base), []).map((a) => a.id)).not.toContain("cancelamentos");
  });

  it("departamento crítico gera alerta; o sentido (sobe ou cai) define o tipo", () => {
    const sobe = calcularLinha({ codigo: 1, descricao: "A", compra: 50, venda: 100, compraAnterior: 10, vendaAnterior: 100 });
    const cai = calcularLinha({ codigo: 2, descricao: "B", compra: 10, venda: 100, compraAnterior: 50, vendaAnterior: 100 });
    const r = alertas(indicadores(base), indicadores(base), [sobe, cai, sem]);
    expect(r).toHaveLength(2);
    expect(r.find((a) => a.id === "departamento-1")?.tipo).toBe("compra-alta");
    expect(r.find((a) => a.id === "departamento-2")?.tipo).toBe("compra-baixa");
  });
});
