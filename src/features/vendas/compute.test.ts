import { describe, expect, it } from "vitest";
import { calcularDesempenho, combinarSeries, indicadores, serieDiaria } from "./compute";
import type { DiaVendas, LinhaCuponsNivel } from "./types";

const dia = (data: string, parcial: Partial<DiaVendas> = {}): DiaVendas => ({
  data,
  venda: null,
  custo: null,
  vendaPdv: null,
  cupons: null,
  itens: null,
  ...parcial,
});

describe("combinarSeries", () => {
  it("preenche todos os dias e junta as fontes (vendas + cupons)", () => {
    const r = combinarSeries({ inicio: "2026-11-01", fim: "2026-11-02" }, { inicio: "2026-10-30", fim: "2026-10-31" }, [
      { atual: [{ data: "2026-11-01", venda: 500, custo: 300 }], anterior: [] },
      { atual: [{ data: "2026-11-01", cupons: 25, itens: 100, vendaPdv: 450 }], anterior: [] },
    ]);
    expect(r.atual.dias).toHaveLength(2);
    expect(r.atual.dias[0]).toMatchObject({ venda: 500, custo: 300, cupons: 25, itens: 100, vendaPdv: 450 });
    expect(r.atual.dias[1].venda).toBeNull();
    expect(r.anterior.dias.map((d) => d.data)).toEqual(["2026-10-30", "2026-10-31"]);
  });
});

describe("indicadores de vendas", () => {
  const dias = [
    dia("d1", { venda: 1000, custo: 750, vendaPdv: 900, cupons: 30, itens: 90 }),
    dia("d2", { venda: 1000, custo: 750, vendaPdv: 1100, cupons: 70, itens: 310 }),
  ];

  it("lucro, margem, ticket médio e itens por cupom", () => {
    const i = indicadores(dias);
    expect(i.lucro).toBe(500);
    expect(i.margem).toBe(25);
    expect(i.ticketMedio).toBe(20); // 2000 PDV ÷ 100 cupons
    expect(i.itensPorCupom).toBe(4); // 400 ÷ 100
  });

  it("sem cupons carregados, ticket e itens por cupom ficam null (não 0)", () => {
    const i = indicadores([dia("d1", { venda: 100, custo: 50 })]);
    expect(i.ticketMedio).toBeNull();
    expect(i.itensPorCupom).toBeNull();
    expect(i.cobertura.cupons).toBe(0);
  });

  it("sem venda, a margem é null", () => {
    expect(indicadores([dia("d1")]).margem).toBeNull();
  });

  it("serieDiaria deixa null os dias sem a base", () => {
    const s = serieDiaria([dia("d1", { venda: 100, custo: 60 }), dia("d2")], (i) => i.margem, "venda");
    expect(s[0].valor).toBeCloseTo(40);
    expect(s[1].valor).toBeNull();
  });
});

describe("calcularDesempenho", () => {
  const linha = {
    codigo: 1,
    descricao: "Bebidas",
    pai: null,
    venda: 1000,
    custo: 800,
    vendaAnterior: 800,
    custoAnterior: 560,
  };
  const cupons: LinhaCuponsNivel = { codigo: 1, cupons: 100, itens: 400, cuponsAnterior: 80, itensAnterior: 240 };

  it("calcula venda, lucro, margem, variações e participação", () => {
    const r = calcularDesempenho(linha, cupons, 5000);
    expect(r.lucro).toBe(200);
    expect(r.margem).toBe(20);
    expect(r.variacaoVenda).toBe(25);
    expect(r.variacaoLucro).toBeCloseTo(-16.666, 2); // 200 contra 240
    expect(r.variacaoMargemPp).toBeCloseTo(-10); // 20% contra 30%
    expect(r.participacao).toBe(20);
  });

  it("cupons e itens por cupom, com variação contra o período anterior", () => {
    const r = calcularDesempenho(linha, cupons, 5000);
    expect(r.cupons).toBe(100);
    expect(r.variacaoCupons).toBe(25);
    expect(r.itensPorCupom).toBe(4);
    expect(r.variacaoItensPorCupom).toBeCloseTo(33.333, 2); // 4 contra 3
  });

  it("cupons ainda carregando (undefined) é diferente de sem cupons (null)", () => {
    const carregando = calcularDesempenho(linha, undefined, 5000);
    expect(carregando.cupons).toBeUndefined();
    expect(carregando.variacaoCupons).toBeUndefined();
    expect(carregando.itensPorCupom).toBeUndefined();

    const semCupons = calcularDesempenho(linha, null, 5000);
    expect(semCupons.cupons).toBeNull();
    expect(semCupons.variacaoCupons).toBeNull();
    expect(semCupons.itensPorCupom).toBeNull();
  });

  it("sem venda anterior ou venda total zero, as razões são null", () => {
    const r = calcularDesempenho({ ...linha, vendaAnterior: 0, custoAnterior: 0 }, cupons, 0);
    expect(r.variacaoVenda).toBeNull();
    expect(r.variacaoMargemPp).toBeNull();
    expect(r.participacao).toBeNull();
  });
});
