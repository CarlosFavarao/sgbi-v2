/**
 * Aparência comum dos gráficos Recharts. No modo `detalhado` (janela ampliada)
 * a fonte é maior, há mais marcações nos eixos e a grade também é vertical.
 */

const tick = (detalhado: boolean) => ({ fill: "var(--muted-foreground)", fontSize: detalhado ? 12 : 11 });

export const propsEixoX = (detalhado: boolean) => ({
  tick: tick(detalhado),
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
  minTickGap: detalhado ? 4 : 8,
});

export const propsEixoY = (detalhado: boolean) => ({
  tick: tick(detalhado),
  tickLine: false,
  axisLine: false,
  ...(detalhado ? { tickCount: 8 } : {}),
});

export const propsGrade = (detalhado: boolean) => ({
  stroke: "var(--border)",
  vertical: detalhado,
});

/** Tamanho de bolinhas e linhas do gráfico ampliado. */
export const escala = (detalhado: boolean) => ({ ponto: detalhado ? 4 : 3, pontoAtivo: detalhado ? 6 : 5, barra: detalhado ? 1.8 : 1 });

/**
 * Espera (ms) antes de redesenhar um gráfico cujo card mudou de tamanho: enquanto o
 * usuário redimensiona ou move cards, o Recharts não refaz o SVG a cada quadro (D43).
 */
export const DEBOUNCE_GRAFICO = 180;
