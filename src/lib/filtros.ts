// Tipos dos filtros comuns a todas as telas (Período, Comparar com, Filial, Origem).

/** Datas sempre em ISO `YYYY-MM-DD`. */
export type Periodo = { inicio: string; fim: string };

export type AtalhoComparacao =
  | "periodo-anterior"
  | "semana-anterior"
  | "mes-anterior"
  | "trimestre-anterior"
  | "ano-anterior";

/**
 * Atalho (acompanha o Período quando ele muda) ou datas escolhidas no calendário.
 * Resolvido em datas por `periodoComparacao` (date.ts).
 */
export type Comparacao = { tipo: AtalhoComparacao } | { tipo: "personalizado"; periodo: Periodo };

/** "todos" = PDV + Faturamento. */
export type Origem = "todos" | "pdv" | "faturamento";

export type Filtros = {
  periodo: Periodo;
  comparacao: Comparacao;
  filiais: number[];
  origem: Origem;
};

export type Filial = { codigo: number; descricao: string };

export type FiliaisResponse = {
  filiais: Filial[];
  /** Primeiro dia carregado e último dia com venda na analise gerencial. */
  dataMinima: string | null;
  dataMaxima: string | null;
};

export type Granularidade = "dia" | "semana" | "mes";

/** Níveis mercadológicos (departamento → grupo → subgrupo). */
export type Nivel = "departamento" | "grupo" | "subgrupo";
