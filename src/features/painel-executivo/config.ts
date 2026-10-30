import type { Periodo } from "./types";

/**
 * Regras de negócio ainda provisórias (decisão 1 em docs/painel-executivo-poc.md).
 * Ajuste aqui quando a área de negócio definir os valores.
 */
export const PAINEL_CONFIG = {
  /**
   * Situação da compra sobre venda por departamento/grupo/subgrupo,
   * pela variação absoluta em p.p. contra o período de comparação.
   */
  situacao: {
    bomAtePp: 2,
    atencaoAtePp: 6,
  },
  /** Limites que geram um alerta em "Alertas e Pontos de Atenção". */
  alertas: {
    quedaMargemPp: 0.5,
    aumentoDespesaSobreVendaPp: 0.5,
    aumentoCancelamentosPct: 10,
    aumentoDescontosPct: 5,
    /** Também alerta cada departamento em situação crítica. */
    departamentoCritico: true,
  },
} as const;

/**
 * Período inicial da tela. Em homologação os dados completos mais recentes são
 * de julho/2026; troque por "mês atual" quando a carga estiver em dia.
 */
export const PERIODO_PADRAO: Periodo = { inicio: "2026-07-01", fim: "2026-07-31" };
