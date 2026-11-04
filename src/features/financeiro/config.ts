/** Regras ajustáveis da tela de Fluxo de Caixa (pendências P42 a P50 em docs/decisoes-e-pendencias.md). */
export const FINANCEIRO_CONFIG = {
  /** Dias do fluxo previsto e dos compromissos a vencer. */
  diasPrevistos: 30,
  /** Janela (dias até a referência) dos prazos médios de recebimento e pagamento. */
  diasPrazos: 90,
  /** Categorias no gráfico por categoria; o resto vira "Outros". */
  categoriasNoGrafico: 5,
  /** Linhas do card de compromissos (o resto em "Ver todos"). */
  compromissosNoCard: 6,
} as const;
