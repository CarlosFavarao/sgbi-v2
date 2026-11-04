const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Valores sempre com 2 casas decimais (arredondadas na 2ª casa).
const decimal2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Só para rótulos de eixo dos gráficos (escala, não valor).
const decimal1 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** R$ 850.430,27 */
export function formatMoeda(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return currency.format(value);
}

/** 1.234,57 */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return decimal2.format(value);
}

/** Eixo dos gráficos: R$ 80 mil, R$ 1,2 mi. */
export function formatMoedaCompacta(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${decimal1.format(value / 1_000_000)} mi`;
  if (abs >= 1_000) return `R$ ${integer.format(value / 1_000)} mil`;
  return `R$ ${integer.format(value)}`;
}

/** 24,53% */
export function formatPercentual(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${decimal2.format(value)}%`;
}

/** +8,21% */
export function formatVariacao(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${decimal2.format(value)}%`;
}

/** -0,72 p.p. */
export function formatPontos(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${decimal2.format(value)} p.p.`;
}

export function formatInteiro(value: number): string {
  return integer.format(value);
}

/** 2026-07-05 → 05/07 */
export function formatDiaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** 2026-07-05 → 05/07/2026 */
export function formatData(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** 2026-07 → jul/2026 */
export function formatMesAno(isoMonth: string): string {
  return `${meses[Number(isoMonth.slice(5, 7)) - 1]}/${isoMonth.slice(0, 4)}`;
}
