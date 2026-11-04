import { addDays, eachDay, startOfWeek } from "@/lib/date";
import type { Movimento, Periodo, TipoMovimento } from "./types";

const no = (p: Periodo, data: string) => data >= p.inicio && data <= p.fim;

/** Entradas e saídas realizadas no período (recebido/pago e cartões liquidados). */
export function realizadoNoPeriodo(movimentos: Movimento[], p: Periodo) {
  let entradas = 0;
  let saidas = 0;
  for (const m of movimentos) {
    if (m.situacao !== "realizado" || !no(p, m.data)) continue;
    if (m.tipo === "entrada") entradas += m.valor;
    else saidas += m.valor;
  }
  return { entradas, saidas, resultado: entradas - saidas };
}

/** Títulos vencidos em aberto até a referência. */
export function vencidos(movimentos: Movimento[]) {
  let receber = 0;
  let pagar = 0;
  for (const m of movimentos) {
    if (m.situacao !== "vencido") continue;
    if (m.tipo === "entrada") receber += m.valor;
    else pagar += m.valor;
  }
  return { receber, pagar };
}

export type DiaCaixa = {
  data: string;
  entradas: number;
  saidas: number;
  /** Entradas e saídas previstas (em aberto) do dia. */
  entradasPrevistas: number;
  saidasPrevistas: number;
};

export function porDia(movimentos: Movimento[], p: Periodo): DiaCaixa[] {
  const dias = new Map(
    eachDay(p).map((data) => [data, { data, entradas: 0, saidas: 0, entradasPrevistas: 0, saidasPrevistas: 0 }]),
  );
  for (const m of movimentos) {
    const d = dias.get(m.data);
    if (!d || m.situacao === "vencido") continue;
    const previsto = m.situacao === "previsto";
    if (m.tipo === "entrada") d[previsto ? "entradasPrevistas" : "entradas"] += m.valor;
    else d[previsto ? "saidasPrevistas" : "saidas"] += m.valor;
  }
  return [...dias.values()];
}

export type PontoEvolucaoCaixa = DiaCaixa & {
  /** Resultado acumulado do mês até o dia (realizado). */
  acumulado: number | null;
  /** Resultado acumulado projetado (da referência em diante). */
  projetado: number | null;
};

/** Evolução do mês: barras do dia e resultado acumulado realizado e projetado (P42: sem saldo bancário). */
export function evolucaoDoMes(movimentos: Movimento[], mes: Periodo, referencia: string): PontoEvolucaoCaixa[] {
  let acumulado = 0;
  return porDia(movimentos, mes).map((d) => {
    acumulado += d.entradas - d.saidas + d.entradasPrevistas - d.saidasPrevistas;
    // A linha projetada começa na referência, para continuar a realizada sem buraco.
    return {
      ...d,
      acumulado: d.data <= referencia ? acumulado : null,
      projetado: d.data >= referencia ? acumulado : null,
    };
  });
}

export type Granularidade = "dia" | "semana" | "mes";

export type LinhaPrevista = {
  chave: string;
  inicio: string;
  fim: string;
  entradas: number;
  saidas: number;
  saldo: number;
  /** Acumulado a partir da referência (sem saldo inicial). */
  acumulado: number;
  status: "ok" | "atencao" | "critico";
};

/**
 * Fluxo previsto dos próximos dias (só títulos em aberto e cartões a liquidar),
 * agrupado por dia, semana ou mês. Status: dia negativo = Atenção; acumulado
 * negativo = Crítico (P46).
 */
export function fluxoPrevisto(
  movimentos: Movimento[],
  referencia: string,
  dias: number,
  granularidade: Granularidade,
): LinhaPrevista[] {
  const periodo = { inicio: addDays(referencia, 1), fim: addDays(referencia, dias) };
  const grupos = new Map<string, LinhaPrevista>();
  for (const d of porDia(movimentos, periodo)) {
    const chave =
      granularidade === "semana" ? startOfWeek(d.data) : granularidade === "mes" ? d.data.slice(0, 7) : d.data;
    const g = grupos.get(chave) ?? {
      chave,
      inicio: d.data,
      fim: d.data,
      entradas: 0,
      saidas: 0,
      saldo: 0,
      acumulado: 0,
      status: "ok" as const,
    };
    g.fim = d.data;
    g.entradas += d.entradasPrevistas;
    g.saidas += d.saidasPrevistas;
    grupos.set(chave, g);
  }
  let acumulado = 0;
  return [...grupos.values()].map((g) => {
    const saldo = g.entradas - g.saidas;
    acumulado += saldo;
    return { ...g, saldo, acumulado, status: acumulado < 0 ? "critico" : saldo < 0 ? "atencao" : "ok" };
  });
}

export type Categoria = { categoria: string; valor: number; participacao: number };

/** Realizado por categoria no período (maiores primeiro; o resto em "Outros"). */
export function porCategoria(movimentos: Movimento[], p: Periodo, tipo: TipoMovimento, limite: number) {
  const valores = new Map<string, number>();
  for (const m of movimentos) {
    if (m.tipo !== tipo || m.situacao !== "realizado" || !no(p, m.data)) continue;
    valores.set(m.categoria, (valores.get(m.categoria) ?? 0) + m.valor);
  }
  const total = [...valores.values()].reduce((t, v) => t + v, 0);
  const ordenadas = [...valores.entries()].sort((a, b) => b[1] - a[1]);
  const lista =
    ordenadas.length > limite + 1
      ? [...ordenadas.slice(0, limite), ["Outros", ordenadas.slice(limite).reduce((t, [, v]) => t + v, 0)] as const]
      : ordenadas;
  return {
    total,
    categorias: lista.map(([categoria, valor]): Categoria => ({
      categoria,
      valor,
      participacao: total ? (valor / total) * 100 : 0,
    })),
  };
}

export type PontoMensal = { mes: string; entradas: number; saidas: number; resultado: number };

/** Entradas e saídas por mês (realizado e em aberto, pela data do movimento). */
export function porMes(movimentos: Movimento[], meses: string[]): PontoMensal[] {
  const mapa = new Map(meses.map((mes) => [mes, { mes, entradas: 0, saidas: 0, resultado: 0 }]));
  for (const m of movimentos) {
    const p = mapa.get(m.data.slice(0, 7));
    if (!p) continue;
    if (m.tipo === "entrada") p.entradas += m.valor;
    else p.saidas += m.valor;
  }
  return [...mapa.values()].map((p) => ({ ...p, resultado: p.entradas - p.saidas }));
}
