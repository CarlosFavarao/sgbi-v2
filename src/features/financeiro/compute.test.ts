import { describe, expect, it } from "vitest";
import { evolucaoDoMes, fluxoPrevisto, porCategoria, porDia, porMes, realizadoNoPeriodo, vencidos } from "./compute";
import type { Movimento } from "./types";

const mov = (
  data: string,
  tipo: Movimento["tipo"],
  situacao: Movimento["situacao"],
  valor: number,
  categoria = "Geral",
): Movimento => ({ data, tipo, fonte: tipo === "entrada" ? "receber" : "pagar", categoria, situacao, valor });

describe("realizadoNoPeriodo", () => {
  const movimentos = [
    mov("2026-11-01", "entrada", "realizado", 100),
    mov("2026-11-02", "saida", "realizado", 30),
    mov("2026-11-02", "entrada", "previsto", 999), // não é realizado
    mov("2026-11-02", "saida", "vencido", 999), // não é realizado
    mov("2026-10-31", "entrada", "realizado", 999), // fora do período
  ];

  it("soma só o realizado dentro do período", () => {
    expect(realizadoNoPeriodo(movimentos, { inicio: "2026-11-01", fim: "2026-11-30" })).toEqual({
      entradas: 100,
      saidas: 30,
      resultado: 70,
    });
  });

  it("sem movimentos, tudo zero", () => {
    expect(realizadoNoPeriodo([], { inicio: "2026-11-01", fim: "2026-11-30" })).toEqual({
      entradas: 0,
      saidas: 0,
      resultado: 0,
    });
  });
});

describe("vencidos", () => {
  it("separa o que está vencido a receber e a pagar, ignorando as outras situações", () => {
    const r = vencidos([
      mov("2026-10-01", "entrada", "vencido", 100),
      mov("2026-10-02", "entrada", "vencido", 50),
      mov("2026-10-03", "saida", "vencido", 70),
      mov("2026-11-03", "saida", "previsto", 999),
      mov("2026-11-03", "entrada", "realizado", 999),
    ]);
    expect(r).toEqual({ receber: 150, pagar: 70 });
  });
});

describe("porDia", () => {
  const periodo = { inicio: "2026-11-01", fim: "2026-11-03" };

  it("um registro por dia, separando realizado e previsto; vencido fica de fora", () => {
    const r = porDia(
      [
        mov("2026-11-01", "entrada", "realizado", 10),
        mov("2026-11-01", "entrada", "realizado", 5),
        mov("2026-11-02", "saida", "previsto", 7),
        mov("2026-11-02", "entrada", "vencido", 999),
        mov("2026-12-01", "entrada", "realizado", 999), // fora do período
      ],
      periodo,
    );
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ data: "2026-11-01", entradas: 15, saidas: 0 });
    expect(r[1]).toMatchObject({ saidasPrevistas: 7, entradas: 0, entradasPrevistas: 0 });
    expect(r[2]).toMatchObject({ entradas: 0, saidas: 0 });
  });
});

describe("evolucaoDoMes", () => {
  const mes = { inicio: "2026-11-01", fim: "2026-11-04" };
  const movimentos = [
    mov("2026-11-01", "entrada", "realizado", 100),
    mov("2026-11-02", "saida", "realizado", 30),
    mov("2026-11-03", "entrada", "previsto", 50),
    mov("2026-11-04", "saida", "previsto", 80),
  ];

  it("acumulado vai até a referência; projetado começa nela, sem buraco", () => {
    const r = evolucaoDoMes(movimentos, mes, "2026-11-02");
    expect(r.map((d) => d.acumulado)).toEqual([100, 70, null, null]);
    expect(r.map((d) => d.projetado)).toEqual([null, 70, 120, 40]);
  });

  it("na data de referência as duas linhas têm o mesmo valor", () => {
    const r = evolucaoDoMes(movimentos, mes, "2026-11-02");
    expect(r[1].acumulado).toBe(r[1].projetado);
  });
});

describe("fluxoPrevisto", () => {
  // Referência 02/11 (segunda): o fluxo previsto começa no dia seguinte.
  const movimentos = [
    mov("2026-11-03", "saida", "previsto", 100),
    mov("2026-11-04", "entrada", "previsto", 300),
    mov("2026-11-05", "saida", "previsto", 10),
    mov("2026-11-02", "entrada", "previsto", 999), // o dia da referência não entra
    mov("2026-11-04", "entrada", "realizado", 999), // realizado não é previsão
    mov("2026-11-04", "saida", "vencido", 999), // vencido não é previsão
  ];

  it("começa no dia seguinte à referência e cobre o número de dias pedido", () => {
    const r = fluxoPrevisto(movimentos, "2026-11-02", 3, "dia");
    expect(r.map((l) => l.chave)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
  });

  it("acumula o saldo e define o status: acumulado negativo = crítico, dia negativo = atenção", () => {
    const r = fluxoPrevisto(movimentos, "2026-11-02", 3, "dia");
    expect(r.map((l) => l.saldo)).toEqual([-100, 300, -10]);
    expect(r.map((l) => l.acumulado)).toEqual([-100, 200, 190]);
    expect(r.map((l) => l.status)).toEqual(["critico", "ok", "atencao"]);
  });

  it("agrupa por semana (segunda a domingo), com início e fim dentro do intervalo pedido", () => {
    const r = fluxoPrevisto([], "2026-11-06", 10, "semana");
    expect(r.map((l) => l.chave)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(r[0]).toMatchObject({ inicio: "2026-11-07", fim: "2026-11-08" });
    expect(r[2]).toMatchObject({ inicio: "2026-11-16", fim: "2026-11-16" });
  });

  it("agrupa por mês", () => {
    const r = fluxoPrevisto([mov("2026-12-01", "entrada", "previsto", 10)], "2026-11-06", 30, "mes");
    expect(r.map((l) => l.chave)).toEqual(["2026-11", "2026-12"]);
    expect(r[1].entradas).toBe(10);
  });

  it("sem movimentos, tudo ok e zerado", () => {
    const r = fluxoPrevisto([], "2026-11-02", 2, "dia");
    expect(r.every((l) => l.status === "ok" && l.saldo === 0 && l.acumulado === 0)).toBe(true);
  });
});

describe("porCategoria", () => {
  const periodo = { inicio: "2026-11-01", fim: "2026-11-30" };
  const saidas = [
    mov("2026-11-01", "saida", "realizado", 100, "Aluguel"),
    mov("2026-11-02", "saida", "realizado", 50, "Energia"),
    mov("2026-11-03", "saida", "realizado", 30, "Água"),
    mov("2026-11-04", "saida", "realizado", 20, "Internet"),
    mov("2026-11-05", "saida", "realizado", 10, "Limpeza"),
    mov("2026-11-05", "entrada", "realizado", 999, "Vendas"), // tipo errado
    mov("2026-11-05", "saida", "previsto", 999, "Futuro"), // não realizado
  ];

  it("ordena da maior para a menor e calcula a participação", () => {
    const r = porCategoria(saidas, periodo, "saida", 10);
    expect(r.total).toBe(210);
    expect(r.categorias.map((c) => c.categoria)).toEqual(["Aluguel", "Energia", "Água", "Internet", "Limpeza"]);
    expect(r.categorias[0].participacao).toBeCloseTo(47.619, 2);
    expect(r.categorias.reduce((t, c) => t + c.participacao, 0)).toBeCloseTo(100);
  });

  it("acima do limite, o resto vira 'Outros' e o total não muda", () => {
    const r = porCategoria(saidas, periodo, "saida", 2);
    expect(r.categorias.map((c) => c.categoria)).toEqual(["Aluguel", "Energia", "Outros"]);
    expect(r.categorias[2].valor).toBe(60);
    expect(r.categorias.reduce((t, c) => t + c.valor, 0)).toBe(r.total);
  });

  it("quando só sobraria uma categoria para o 'Outros', mostra ela mesma", () => {
    const r = porCategoria(saidas.slice(0, 3), periodo, "saida", 2);
    expect(r.categorias.map((c) => c.categoria)).toEqual(["Aluguel", "Energia", "Água"]);
  });

  it("agrupa movimentos da mesma categoria", () => {
    const r = porCategoria(
      [mov("2026-11-01", "saida", "realizado", 10, "X"), mov("2026-11-02", "saida", "realizado", 15, "X")],
      periodo,
      "saida",
      5,
    );
    expect(r.categorias).toEqual([{ categoria: "X", valor: 25, participacao: 100 }]);
  });

  it("sem movimentos: total zero e participação zero (sem divisão por zero)", () => {
    const r = porCategoria([], periodo, "entrada", 5);
    expect(r).toEqual({ total: 0, categorias: [] });
  });
});

describe("porMes", () => {
  it("soma entradas e saídas por mês, de qualquer situação, só nos meses pedidos", () => {
    const r = porMes(
      [
        mov("2026-10-15", "entrada", "realizado", 100),
        mov("2026-10-20", "saida", "vencido", 40),
        mov("2026-11-02", "entrada", "previsto", 10),
        mov("2026-09-01", "entrada", "realizado", 999), // mês não pedido
      ],
      ["2026-10", "2026-11", "2026-12"],
    );
    expect(r).toEqual([
      { mes: "2026-10", entradas: 100, saidas: 40, resultado: 60 },
      { mes: "2026-11", entradas: 10, saidas: 0, resultado: 10 },
      { mes: "2026-12", entradas: 0, saidas: 0, resultado: 0 },
    ]);
  });
});
