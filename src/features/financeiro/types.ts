export type { Periodo } from "@/lib/filtros";

export type FiltrosFinanceiro = {
  /** Mês de referência (YYYY-MM). */
  mes: string;
  filiais: number[];
};

export type TipoMovimento = "entrada" | "saida";

/**
 * - realizado: recebido/pago (data do recebimento/pagamento) ou cartão já liquidado (vencimento até a referência);
 * - previsto: título em aberto com vencimento depois da referência;
 * - vencido: título em aberto com vencimento até a referência.
 */
export type SituacaoMovimento = "realizado" | "previsto" | "vencido";

/** Fonte do movimento (para os compromissos e a documentação). */
export type FonteMovimento = "cartao" | "receber" | "pagar";

/** Movimento agregado por dia, categoria e situação. */
export type Movimento = {
  data: string;
  tipo: TipoMovimento;
  fonte: FonteMovimento;
  categoria: string;
  situacao: SituacaoMovimento;
  valor: number;
};

export type MovimentosResponse = { movimentos: Movimento[] };

/** Título (ou cartões de um dia agrupados por empresa) a vencer. */
export type Compromisso = {
  data: string;
  tipo: TipoMovimento;
  fonte: FonteMovimento;
  descricao: string;
  valor: number;
  situacao: "previsto" | "vencido";
};

export type CompromissosResponse = { compromissos: Compromisso[] };

/** Prazos médios ponderados pelo valor (dias). */
export type PrazosResponse = {
  recebimentoCartoes: number | null;
  recebimentoClientes: number | null;
  pagamento: number | null;
};
