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

export { PERIODO_PADRAO } from "@/lib/config";
