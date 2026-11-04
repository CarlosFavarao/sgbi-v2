import { VENDAS_CONFIG } from "./config";
import type {
  ClasseAbc,
  CriterioAbc,
  CurvaAbc,
  ListaProdutos,
  ProdutoResumo,
  ProdutosResponse,
} from "./types";

export type ProdutoVenda = {
  codigo: number;
  descricao: string;
  departamento: string;
  venda: number;
  custo: number;
};

const PONTOS_CURVA = 100;

/**
 * Classifica pelo % acumulado do critério, do maior para o menor: entra na A
 * enquanto o acumulado ANTES do produto for menor que a faixa A (o primeiro
 * produto é sempre A), na B até A + B, e o resto na C. Produtos com valor zero
 * ou negativo (ex.: lucro negativo) ficam no fim da curva, na C.
 */
export function curvaAbc(
  produtos: ProdutoVenda[],
  criterio: CriterioAbc,
  faixas: { A: number; B: number } = VENDAS_CONFIG.abc,
): { curva: CurvaAbc; classePorCodigo: Map<number, ClasseAbc> } {
  const valorDe = (p: ProdutoVenda) => (criterio === "faturamento" ? p.venda : p.venda - p.custo);
  const ordenados = [...produtos].sort((a, b) => valorDe(b) - valorDe(a));
  const total = ordenados.reduce((t, p) => t + valorDe(p), 0);

  const classePorCodigo = new Map<number, ClasseAbc>();
  const resumo: Record<ClasseAbc, { produtos: number; valor: number }> = {
    A: { produtos: 0, valor: 0 },
    B: { produtos: 0, valor: 0 },
    C: { produtos: 0, valor: 0 },
  };
  const curva: CurvaAbc["curva"] = [{ produtos: 0, acumulado: 0 }];
  const passo = Math.max(1, Math.floor(ordenados.length / PONTOS_CURVA));

  let acumulado = 0;
  ordenados.forEach((p, i) => {
    const valor = valorDe(p);
    const percentualAntes = total > 0 ? (acumulado / total) * 100 : 100;
    const classe: ClasseAbc =
      valor <= 0 ? "C" : percentualAntes < faixas.A ? "A" : percentualAntes < faixas.A + faixas.B ? "B" : "C";
    classePorCodigo.set(p.codigo, classe);
    resumo[classe].produtos++;
    resumo[classe].valor += valor;
    acumulado += valor;
    if ((i + 1) % passo === 0 || i === ordenados.length - 1) {
      curva.push({
        produtos: ((i + 1) / ordenados.length) * 100,
        acumulado: total > 0 ? Math.min(100, Math.max(0, (acumulado / total) * 100)) : 0,
      });
    }
  });

  return {
    classePorCodigo,
    curva: {
      criterio,
      totalProdutos: ordenados.length,
      curva,
      classes: (["A", "B", "C"] as const).map((classe) => ({
        classe,
        produtos: resumo[classe].produtos,
        valor: resumo[classe].valor,
        participacao: total ? (resumo[classe].valor / total) * 100 : 0,
      })),
    },
  };
}

/**
 * Curvas ABC e listas de produtos. As listas usam a classificação por
 * faturamento (os títulos falam de "Classe A" de vendas).
 */
export function montarProdutos(
  produtos: ProdutoVenda[],
  vendaAnterior: Map<number, number>,
  tamanho: number = VENDAS_CONFIG.tamanhoLista,
): ProdutosResponse {
  // Só produtos com venda no período (devoluções puras não entram na curva).
  const comVenda = produtos.filter((p) => p.venda > 0);
  const faturamento = curvaAbc(comVenda, "faturamento");
  const rentabilidade = curvaAbc(comVenda, "rentabilidade");

  const resumos: ProdutoResumo[] = comVenda.map((p) => {
    const anterior = vendaAnterior.get(p.codigo) ?? 0;
    const lucro = p.venda - p.custo;
    return {
      codigo: p.codigo,
      descricao: p.descricao,
      departamento: p.departamento,
      classe: faturamento.classePorCodigo.get(p.codigo)!,
      venda: p.venda,
      vendaAnterior: anterior,
      variacao: anterior > 0 ? ((p.venda - anterior) / anterior) * 100 : null,
      lucro,
      margem: (lucro / p.venda) * 100,
    };
  });

  const classeA = resumos.filter((p) => p.classe === "A");
  const classeAB = resumos.filter((p) => p.classe !== "C");
  const primeiros = (lista: ProdutoResumo[], ordem: (a: ProdutoResumo, b: ProdutoResumo) => number) =>
    lista.sort(ordem).slice(0, tamanho);

  const listas: Record<ListaProdutos, ProdutoResumo[]> = {
    queda: primeiros(
      classeA.filter((p) => p.variacao != null && p.variacao < 0),
      (a, b) => a.variacao! - b.variacao!,
    ),
    crescimento: primeiros(
      classeA.filter((p) => p.variacao != null && p.variacao > 0),
      (a, b) => b.variacao! - a.variacao!,
    ),
    "maior-margem": primeiros([...classeAB], (a, b) => b.margem! - a.margem!),
    "menor-margem": primeiros([...classeAB], (a, b) => a.margem! - b.margem!),
  };

  return { abc: { faturamento: faturamento.curva, rentabilidade: rentabilidade.curva }, listas };
}
