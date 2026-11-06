import { describe, expect, it } from "vitest";
import { curvaAbc, montarProdutos, type ProdutoVenda } from "./abc";

const produto = (codigo: number, venda: number, custo = 0): ProdutoVenda => ({
  codigo,
  descricao: `Produto ${codigo}`,
  departamento: "Dep",
  venda,
  custo,
});

describe("curvaAbc (faixas padrão A 70% + B 20%)", () => {
  const produtos = [produto(1, 70), produto(2, 20), produto(3, 10)];

  it("classifica pelo % acumulado ANTES do produto", () => {
    const { classePorCodigo } = curvaAbc(produtos, "faturamento");
    expect(classePorCodigo.get(1)).toBe("A"); // antes: 0%
    expect(classePorCodigo.get(2)).toBe("B"); // antes: 70% (não é < 70)
    expect(classePorCodigo.get(3)).toBe("C"); // antes: 90% (não é < 90)
  });

  it("ordena do maior para o menor, qualquer que seja a ordem de entrada", () => {
    const { classePorCodigo } = curvaAbc([produto(3, 10), produto(1, 70), produto(2, 20)], "faturamento");
    expect(classePorCodigo.get(1)).toBe("A");
    expect(classePorCodigo.get(3)).toBe("C");
  });

  it("o primeiro produto é sempre A, mesmo sozinho com 100% do total", () => {
    const { classePorCodigo, curva } = curvaAbc([produto(1, 500)], "faturamento");
    expect(classePorCodigo.get(1)).toBe("A");
    expect(curva.classes.find((c) => c.classe === "A")).toMatchObject({ produtos: 1, participacao: 100 });
  });

  it("resumo por classe soma 100% e todos os produtos", () => {
    const { curva } = curvaAbc(produtos, "faturamento");
    expect(curva.totalProdutos).toBe(3);
    expect(curva.classes.map((c) => c.classe)).toEqual(["A", "B", "C"]);
    expect(curva.classes.reduce((t, c) => t + c.produtos, 0)).toBe(3);
    expect(curva.classes.reduce((t, c) => t + c.participacao, 0)).toBeCloseTo(100);
    expect(curva.classes.map((c) => c.valor)).toEqual([70, 20, 10]);
  });

  it("a curva começa em 0/0 e termina em 100% dos produtos e 100% do acumulado", () => {
    const { curva } = curvaAbc(produtos, "faturamento");
    expect(curva.curva[0]).toEqual({ produtos: 0, acumulado: 0 });
    expect(curva.curva.at(-1)).toEqual({ produtos: 100, acumulado: 100 });
  });

  it("amostra a curva em ~100 pontos quando há muitos produtos", () => {
    const muitos = Array.from({ length: 1000 }, (_, i) => produto(i + 1, 1000 - i));
    const { curva } = curvaAbc(muitos, "faturamento");
    expect(curva.curva.length).toBeLessThanOrEqual(102);
    expect(curva.curva.at(-1)).toEqual({ produtos: 100, acumulado: 100 });
  });

  it("valor zero ou negativo vai para a C, no fim", () => {
    const { classePorCodigo } = curvaAbc([produto(1, 100), produto(2, 0), produto(3, -10)], "faturamento");
    expect(classePorCodigo.get(2)).toBe("C");
    expect(classePorCodigo.get(3)).toBe("C");
  });

  it("rentabilidade usa o lucro (venda − custo), não a venda", () => {
    const ps = [produto(1, 1000, 990), produto(2, 100, 0)]; // maior venda, menor lucro
    expect(curvaAbc(ps, "faturamento").classePorCodigo.get(1)).toBe("A");
    expect(curvaAbc(ps, "rentabilidade").classePorCodigo.get(2)).toBe("A");
    expect(curvaAbc(ps, "rentabilidade").classePorCodigo.get(1)).toBe("C"); // antes dele: 90,9% do lucro
  });

  it("aceita faixas personalizadas", () => {
    const { classePorCodigo } = curvaAbc(produtos, "faturamento", { A: 50, B: 40 });
    expect(classePorCodigo.get(2)).toBe("B");
    expect(classePorCodigo.get(3)).toBe("C");
  });

  it("lista vazia não quebra", () => {
    const { curva } = curvaAbc([], "faturamento");
    expect(curva.totalProdutos).toBe(0);
    expect(curva.curva).toEqual([{ produtos: 0, acumulado: 0 }]);
    expect(curva.classes.every((c) => c.participacao === 0)).toBe(true);
  });
});

describe("montarProdutos", () => {
  // Venda total 1250: p1 = 80% (A), p2 = 16% (B, pois antes dela há 80%), p3 = 4% (C).
  const produtos = [produto(1, 1000, 900), produto(2, 200, 100), produto(3, 50, 40), produto(4, -5, 0)];

  it("devoluções (venda ≤ 0) não entram na curva nem nas listas", () => {
    const r = montarProdutos(produtos, new Map());
    expect(r.abc.faturamento.totalProdutos).toBe(3);
    const todos = Object.values(r.listas).flat();
    expect(todos.some((p) => p.codigo === 4)).toBe(false);
  });

  it("queda e crescimento só consideram produtos da classe A", () => {
    const r = montarProdutos(produtos, new Map([[1, 2000], [2, 100], [3, 100]]));
    expect(r.listas.queda.map((p) => p.codigo)).toEqual([1]); // p1 caiu 50%
    expect(r.listas.crescimento).toEqual([]); // p2 cresceu, mas é B
  });

  it("variação é null sem venda no período anterior", () => {
    const r = montarProdutos(produtos, new Map());
    expect(r.listas["maior-margem"].every((p) => p.variacao === null)).toBe(true);
    expect(r.listas.queda).toEqual([]);
  });

  it("maior e menor margem só entre as classes A e B, na ordem certa", () => {
    const r = montarProdutos(produtos, new Map());
    expect(r.listas["maior-margem"].map((p) => p.codigo)).toEqual([2, 1]); // 50% e 10%
    expect(r.listas["menor-margem"].map((p) => p.codigo)).toEqual([1, 2]);
  });

  it("calcula margem e lucro do produto", () => {
    const r = montarProdutos(produtos, new Map());
    const p2 = r.listas["maior-margem"].find((p) => p.codigo === 2)!;
    expect(p2).toMatchObject({ lucro: 100, margem: 50, classe: "B" });
  });

  it("limita o tamanho das listas", () => {
    const muitos = Array.from({ length: 10 }, (_, i) => produto(i + 1, 100, 10 * (i + 1)));
    const r = montarProdutos(muitos, new Map(), 3);
    expect(r.listas["maior-margem"]).toHaveLength(3);
    expect(r.listas["menor-margem"]).toHaveLength(3);
  });
});
