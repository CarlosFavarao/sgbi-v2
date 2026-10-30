import type { Comparacao, Periodo } from "./types";

// Datas ISO (YYYY-MM-DD) manipuladas em UTC para não depender do fuso.

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function daysBetween(inicio: string, fim: string): number {
  return Math.round((parseIso(fim).getTime() - parseIso(inicio).getTime()) / 86_400_000);
}

export function daysInMonth(iso: string): number {
  const d = parseIso(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function firstDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function lastDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-${String(daysInMonth(iso)).padStart(2, "0")}`;
}

/** Todos os dias de `inicio` a `fim`, inclusive. */
export function eachDay({ inicio, fim }: Periodo): string[] {
  const days: string[] = [];
  for (let d = inicio; d <= fim; d = addDays(d, 1)) days.push(d);
  return days;
}

function isFullMonths({ inicio, fim }: Periodo) {
  return inicio.endsWith("-01") && fim === lastDayOfMonth(fim);
}

function shiftMonths(iso: string, months: number, edge: "start" | "end") {
  const d = parseIso(iso);
  const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const first = toIso(shifted);
  return edge === "start" ? first : lastDayOfMonth(first);
}

/**
 * Período de comparação.
 * - "periodo-anterior": meses cheios recuam a mesma quantidade de meses
 *   (jul → jun); senão, a mesma quantidade de dias imediatamente antes.
 * - "ano-anterior": as mesmas datas um ano antes.
 */
export function periodoComparacao(periodo: Periodo, comparacao: Comparacao): Periodo {
  if (comparacao === "ano-anterior") {
    const shiftYear = (iso: string) => {
      const d = parseIso(iso);
      const target = new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), 1));
      const day = Math.min(d.getUTCDate(), daysInMonth(toIso(target)));
      target.setUTCDate(day);
      return toIso(target);
    };
    return { inicio: shiftYear(periodo.inicio), fim: shiftYear(periodo.fim) };
  }

  if (isFullMonths(periodo)) {
    const inicio = parseIso(periodo.inicio);
    const fim = parseIso(periodo.fim);
    const months =
      (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
      fim.getUTCMonth() -
      inicio.getUTCMonth() +
      1;
    return {
      inicio: shiftMonths(periodo.inicio, -months, "start"),
      fim: shiftMonths(periodo.fim, -months, "end"),
    };
  }

  const length = daysBetween(periodo.inicio, periodo.fim) + 1;
  return {
    inicio: addDays(periodo.inicio, -length),
    fim: addDays(periodo.inicio, -1),
  };
}

/** Segunda-feira da semana do dia. */
export function startOfWeek(iso: string): string {
  const weekday = (parseIso(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}
