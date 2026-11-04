/**
 * Regras provisórias da tela de Metas (pendências P32 a P41 em
 * docs/decisoes-e-pendencias.md). Ajuste aqui quando a área de negócio definir.
 */
export const METAS_CONFIG = {
  /**
   * Situação contra o ritmo: realizado ÷ meta esperada até a data de referência.
   * A partir de `acimaDe`% = Acima; a partir de `noRitmoDe`% = No ritmo; abaixo disso = Abaixo.
   */
  ritmo: { acimaDe: 100, noRitmoDe: 95 },
  /**
   * Situação da margem: margem atual − meta de margem, em p.p.
   * Até `okAte` p.p. abaixo da meta = Ok; até `atencaoAte` = Atenção; mais que isso = Crítico.
   */
  margem: { okAte: 0.5, atencaoAte: 2 },
  /** Linhas dos cards "Departamentos em risco" e "Melhor desempenho" (o resto em "Ver todos"). */
  linhasNoCard: 3,
} as const;
