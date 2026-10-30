/** "todos" = PDV + Faturamento. */
export type Origem = "todos" | "pdv" | "faturamento";

export type Comparacao = "periodo-anterior" | "ano-anterior";

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
