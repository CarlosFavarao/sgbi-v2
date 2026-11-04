import type { Nivel, Origem, Periodo } from "@/lib/filtros";

export type { Nivel, Origem, Periodo } from "@/lib/filtros";

/** Abas de período, todas relativas à data de referência (último dia carregado do mês). */
export type AbaPeriodo = "dia" | "semana" | "quinzena1" | "quinzena2" | "mes" | "ano";

export type PeriodoMeta = {
  id: AbaPeriodo;
  label: string;
  /** Texto curto do intervalo (ex.: "14/07 – 20/07"). */
  descricao: string;
  /** Período inteiro (a meta é sempre do período inteiro). */
  periodo: Periodo;
  /** Parte do período até a referência; null = o período ainda não começou. */
  decorrido: Periodo | null;
  /** Período de comparação da parte decorrida (ex.: dia → mesmo dia da semana anterior). */
  comparacao: Periodo | null;
  /** Período de comparação inteiro (para a meta do período anterior). */
  periodoComparacao: Periodo;
  /** Rótulo curto da comparação (ex.: "sem. ant."). */
  rotuloComparacao: string;
};

export type FiltrosMetas = {
  /** Mês de referência (YYYY-MM). */
  mes: string;
  filiais: number[];
  origem: Origem;
  /** null = todos os departamentos. */
  departamento: number | null;
};

/** Meta de um dia (loja inteira ou do departamento filtrado). */
export type MetaDia = { data: string; meta: number; metaLucro: number };

export type MetasDiariasResponse = { dias: MetaDia[] };

/** Venda e custo de um dia (analise gerencial). */
export type RealizadoDia = { data: string; venda: number; custo: number };

export type RealizadoDiarioResponse = { dias: RealizadoDia[] };

export type TotalResponse = { venda: number; custo: number };

/** Meta e realizado de um departamento, grupo ou subgrupo no período da aba. */
export type LinhaMetaNivel = {
  codigo: number;
  descricao: string;
  /** Nível acima (grupo → departamento, subgrupo → grupo); null no departamento. */
  pai: number | null;
  /** Meta do período inteiro e a parte esperada até a referência; null = sem meta cadastrada. */
  meta: number | null;
  metaEsperada: number | null;
  metaLucro: number | null;
  venda: number;
  custo: number;
  vendaAnterior: number;
};

export type NiveisMetasResponse = { nivel: Nivel; linhas: LinhaMetaNivel[] };

export type OpcoesMetasResponse = {
  /** Meses (YYYY-MM) com meta cadastrada nas filiais. */
  mesesComMeta: string[];
  departamentos: { codigo: number; descricao: string }[];
};

/** Situação contra o ritmo da meta (realizado × meta esperada até a referência). */
export type StatusMeta = "acima" | "no-ritmo" | "abaixo" | "aguardando" | "sem-meta";

/** Situação da margem atual contra a meta de margem. */
export type StatusMargem = "ok" | "atencao" | "critico" | "sem-meta";
