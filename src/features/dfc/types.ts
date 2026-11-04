import type { Filial } from "@/lib/filtros";

/** Comparação do mês: mês anterior ou mesmo mês do ano anterior. */
export type ComparacaoDfc = "mes-anterior" | "ano-anterior";

export type FiltrosDfc = {
  /** Mês (YYYY-MM). */
  mes: string;
  comparacao: ComparacaoDfc;
  filiais: number[];
};

/** Uma linha da DRE num mês (soma das filiais). */
export type LinhaDre = { mes: string; id: string; descricao: string; valor: number };

export type DreResponse = { linhas: LinhaDre[] };

export type OpcoesDfcResponse = {
  /** Meses com DRE (YYYY-MM), do mais antigo ao mais recente. */
  meses: string[];
  /** Último mês com receita (padrão da tela). */
  ultimoMesComReceita: string | null;
  /** Filiais com DRE (a lista de filiais das outras telas vem da venda). */
  filiais: Filial[];
};

/** Movimento financeiro individual do mês (títulos e cartões por dia e empresa). */
export type Movimentacao = {
  data: string;
  descricao: string;
  tipo: "entrada" | "saida";
  origem: "Cartão" | "Contas a receber" | "Contas a pagar";
  situacao: "realizado" | "em-aberto";
  valor: number;
};

export type MovimentacoesResponse = { movimentacoes: Movimentacao[] };

export type AtividadeDfc = "operacional" | "investimento" | "financiamento";
