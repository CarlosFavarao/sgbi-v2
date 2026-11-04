import type { Nivel } from "@/lib/filtros";

export type { Filtros, Nivel, Periodo } from "@/lib/filtros";

/**
 * Fontes da série diária, consultadas separadamente:
 * - `vendas`: analise gerencial (respeita a Origem);
 * - `cupons`: `logpdv` (só PDV; consulta lenta, ver P23 em docs/decisoes-e-pendencias.md).
 */
export type FonteVendas = "vendas" | "cupons";

/** Um dia com carga em uma fonte (só os campos daquela fonte). */
export type PontoVendas = {
  data: string;
  venda?: number;
  custo?: number;
  /** Venda do PDV no `logpdv` (base do ticket médio). */
  vendaPdv?: number;
  cupons?: number;
  /** Quantidade vendida (unidades e kg, como a "cesta média" do BI antigo). */
  itens?: number;
};

export type SerieVendasResponse = { atual: PontoVendas[]; anterior: PontoVendas[] };

/** Valores de um dia; `null` = sem carga para esse dia naquela fonte. */
export type DiaVendas = {
  data: string;
  venda: number | null;
  custo: number | null;
  vendaPdv: number | null;
  cupons: number | null;
  itens: number | null;
};

/** Venda e custo de um departamento, grupo ou subgrupo nos dois períodos. */
export type LinhaVendaNivel = {
  codigo: number;
  descricao: string;
  /** Código do nível acima (grupo → departamento, subgrupo → grupo); null no departamento. */
  pai: number | null;
  venda: number;
  custo: number;
  vendaAnterior: number;
  custoAnterior: number;
};

export type NiveisResponse = { nivel: Nivel; linhas: LinhaVendaNivel[] };

/**
 * Cupons que tiveram ao menos um item do nível e itens vendidos do nível (PDV).
 * A soma dos cupons dos níveis passa do total: um cupom conta em cada
 * departamento de que comprou.
 */
export type LinhaCuponsNivel = {
  codigo: number;
  cupons: number;
  itens: number;
  cuponsAnterior: number;
  itensAnterior: number;
};

export type CuponsNivelResponse = { nivel: Nivel; linhas: LinhaCuponsNivel[] };

export type ClasseAbc = "A" | "B" | "C";

/** Critério da Curva ABC: participação na venda ou no lucro bruto. */
export type CriterioAbc = "faturamento" | "rentabilidade";

export type ResumoClasse = {
  classe: ClasseAbc;
  produtos: number;
  /** % do total do critério (venda ou lucro) acumulado pela classe. */
  participacao: number;
  /** Venda (faturamento) ou lucro bruto (rentabilidade) da classe. */
  valor: number;
};

export type CurvaAbc = {
  criterio: CriterioAbc;
  classes: ResumoClasse[];
  /** Curva de Pareto amostrada: % dos produtos × % acumulado do critério. */
  curva: { produtos: number; acumulado: number }[];
  totalProdutos: number;
};

export type ProdutoResumo = {
  codigo: number;
  descricao: string;
  departamento: string;
  classe: ClasseAbc;
  venda: number;
  vendaAnterior: number;
  /** Variação % da venda contra o período de comparação; null sem venda anterior. */
  variacao: number | null;
  lucro: number;
  /** Margem bruta %; null sem venda. */
  margem: number | null;
};

export type ListaProdutos = "queda" | "crescimento" | "maior-margem" | "menor-margem";

export type ProdutosResponse = {
  abc: Record<CriterioAbc, CurvaAbc>;
  listas: Record<ListaProdutos, ProdutoResumo[]>;
};
