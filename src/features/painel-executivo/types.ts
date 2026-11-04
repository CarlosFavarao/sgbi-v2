/** "todos" = PDV + Faturamento. */
export type Origem = "todos" | "pdv" | "faturamento";

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

export type Nivel = "departamento" | "grupo" | "subgrupo";

export type Granularidade = "dia" | "semana" | "mes";

/** Datas sempre em ISO `YYYY-MM-DD`. */
export type Periodo = { inicio: string; fim: string };

export type Filtros = {
  periodo: Periodo;
  comparacao: Comparacao;
  filiais: number[];
  origem: Origem;
};

export type Filial = { codigo: number; descricao: string };

export type FiliaisResponse = {
  filiais: Filial[];
  /** Primeiro e último dia com venda na analise gerencial. */
  dataMinima: string | null;
  dataMaxima: string | null;
};

/** Valores de um dia. `null` = sem carga para esse dia. */
export type Dia = {
  data: string;
  venda: number | null;
  custo: number | null;
  compra: number | null;
  /** Base PDV (parfil). */
  vendaPdv: number | null;
  tickets: number | null;
  cancelamentos: number | null;
  despesas: number | null;
};

/** Fontes de dados diários, consultadas separadamente. */
export type Fonte = "vendas" | "pdv" | "cancelamentos" | "despesas";

export type CampoDia = Exclude<keyof Dia, "data">;

/** Um dia com carga em uma fonte (só os campos daquela fonte). */
export type PontoSerie = { data: string } & Partial<Record<CampoDia, number>>;

export type SerieResponse = { atual: PontoSerie[]; anterior: PontoSerie[] };

/** Séries das fontes já carregadas, combinadas dia a dia (campos ausentes = null). */
export type ResumoResponse = {
  atual: { periodo: Periodo; dias: Dia[] };
  anterior: { periodo: Periodo; dias: Dia[] };
};

export type MetaResponse = {
  /** Meta somada dos dias do período filtrado. */
  metaPeriodo: number;
  /** Mês (YYYY-MM) do fim do período. */
  mes: string;
  metaMes: number;
  /** Realizado do dia 1 do mês até o fim do período. */
  realizadoMes: number;
  /** Dias do mês depois do fim do período. */
  diasRestantes: number;
};

export type LinhaNivel = {
  codigo: number;
  descricao: string;
  compra: number;
  venda: number;
  compraAnterior: number;
  vendaAnterior: number;
};

export type DepartamentosResponse = { linhas: LinhaNivel[] };
