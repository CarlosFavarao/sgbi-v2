import {
  addDays,
  firstDayOfMonth,
  lastDayOfMonth,
  resolverAtalhoComparacao,
  startOfWeek,
} from "@/lib/date";
import { formatDiaMes } from "@/lib/format";
import type { AbaPeriodo, PeriodoMeta, Periodo } from "./types";

const min = (a: string, b: string) => (a < b ? a : b);

/**
 * Data de referência ("hoje" da tela): o último dia carregado, limitado ao mês
 * escolhido. Os dados são D-1, então "hoje" nunca é o dia atual do relógio.
 */
export function dataReferencia(mes: string, dataMaxima: string): string {
  return min(lastDayOfMonth(`${mes}-01`), dataMaxima);
}

/** Parte de `periodo` até `referencia`; null quando o período ainda não começou. */
function ateReferencia(periodo: Periodo, referencia: string): Periodo | null {
  if (referencia < periodo.inicio) return null;
  return { inicio: periodo.inicio, fim: min(periodo.fim, referencia) };
}

const intervalo = (p: Periodo) => (p.inicio === p.fim ? formatDiaMes(p.inicio) : `${formatDiaMes(p.inicio)} – ${formatDiaMes(p.fim)}`);

/**
 * As seis abas da tela. A meta é sempre do período inteiro; o realizado vai até
 * a referência. Comparação: dia e semana contra a semana anterior, quinzenas e
 * mês contra o mês anterior, ano contra o ano anterior (P34).
 */
export function periodosDaReferencia(mes: string, referencia: string): PeriodoMeta[] {
  const inicioMes = `${mes}-01`;
  const fimMes = lastDayOfMonth(inicioMes);
  // Mês ainda sem dados: o "dia" é o primeiro dia do mês (aguardando).
  const dia = referencia < inicioMes ? inicioMes : referencia;
  const segunda = startOfWeek(dia);
  const ano = mes.slice(0, 4);

  const definicoes: { id: AbaPeriodo; label: string; periodo: Periodo; comparar: "semana" | "mes" | "ano" }[] = [
    { id: "dia", label: "Dia", periodo: { inicio: dia, fim: dia }, comparar: "semana" },
    { id: "semana", label: "Semana", periodo: { inicio: segunda, fim: addDays(segunda, 6) }, comparar: "semana" },
    { id: "quinzena1", label: "1ª Quinzena", periodo: { inicio: inicioMes, fim: `${mes}-15` }, comparar: "mes" },
    { id: "quinzena2", label: "2ª Quinzena", periodo: { inicio: `${mes}-16`, fim: fimMes }, comparar: "mes" },
    { id: "mes", label: "Mês", periodo: { inicio: firstDayOfMonth(inicioMes), fim: fimMes }, comparar: "mes" },
    { id: "ano", label: "Ano", periodo: { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }, comparar: "ano" },
  ];

  return definicoes.map(({ id, label, periodo, comparar }) => {
    const decorrido = ateReferencia(periodo, referencia);
    const atalho = comparar === "semana" ? "semana-anterior" : comparar === "mes" ? "mes-anterior" : "ano-anterior";
    return {
      id,
      label,
      descricao: id === "ano" ? ano : intervalo(periodo),
      periodo,
      decorrido,
      comparacao: decorrido ? resolverAtalhoComparacao(decorrido, atalho) : null,
      periodoComparacao: resolverAtalhoComparacao(periodo, atalho),
      rotuloComparacao: comparar === "semana" ? "sem. ant." : comparar === "mes" ? "mês ant." : "ano ant.",
    };
  });
}
