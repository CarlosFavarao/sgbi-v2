// Cálculos básicos comuns às telas.

/** a / b × 100, ou null quando o divisor é zero. */
export function percentual(a: number, b: number): number | null {
  return b ? (a / b) * 100 : null;
}

/** Variação % de `atual` sobre `anterior`. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || !anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

/** Diferença em pontos percentuais. */
export function diferencaPp(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null) return null;
  return atual - anterior;
}
