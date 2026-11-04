import { diferencaPp, percentual } from "@/lib/calc";
import { daysBetween, eachDay } from "@/lib/date";
import { METAS_CONFIG } from "./config";
import { somaMetaDiaria } from "./metas";
import type { MetaDia, Periodo, RealizadoDia, StatusMargem, StatusMeta } from "./types";

export { diferencaPp, percentual, somaMetaDiaria };

const dias = (p: Periodo) => daysBetween(p.inicio, p.fim) + 1;

/** Venda e custo somados dos dias de `p` (null quando não há nenhum dia com carga). */
export function somaRealizado(diasRealizados: RealizadoDia[], p: Periodo | null): { venda: number; custo: number } | null {
  if (!p) return null;
  let venda = 0;
  let custo = 0;
  let encontrou = false;
  for (const d of diasRealizados) {
    if (d.data < p.inicio || d.data > p.fim) continue;
    encontrou = true;
    venda += d.venda;
    custo += d.custo;
  }
  return encontrou ? { venda, custo } : null;
}

/** Situação contra o ritmo: realizado × meta esperada até a referência (config.ts). */
export function statusMeta(realizado: number, metaEsperada: number | null, decorrido: Periodo | null): StatusMeta {
  if (!decorrido) return "aguardando";
  if (!metaEsperada) return "sem-meta";
  const ritmo = (realizado / metaEsperada) * 100;
  if (ritmo >= METAS_CONFIG.ritmo.acimaDe) return "acima";
  if (ritmo >= METAS_CONFIG.ritmo.noRitmoDe) return "no-ritmo";
  return "abaixo";
}

/**
 * Projeção de fechamento do período. Com meta: mantém o ritmo atual sobre a
 * curva da meta (realizado ÷ meta esperada × meta). Sem meta: média diária
 * do realizado × dias do período (P35).
 */
export function projecao(
  realizado: number,
  meta: number | null,
  metaEsperada: number | null,
  periodo: Periodo,
  decorrido: Periodo | null,
): number | null {
  if (!decorrido) return null;
  if (meta && metaEsperada) return (realizado / metaEsperada) * meta;
  return (realizado / dias(decorrido)) * dias(periodo);
}

/** Situação da margem atual contra a meta de margem, em p.p. (config.ts). */
export function statusMargem(margem: number | null, metaMargem: number | null): StatusMargem {
  if (margem == null || metaMargem == null) return "sem-meta";
  const diferenca = margem - metaMargem;
  if (diferenca >= -METAS_CONFIG.margem.okAte) return "ok";
  if (diferenca >= -METAS_CONFIG.margem.atencaoAte) return "atencao";
  return "critico";
}

export type ResumoMeta = {
  meta: number | null;
  metaEsperada: number | null;
  realizado: number;
  /** Realizado ÷ meta do período inteiro. */
  atingimento: number | null;
  /** Realizado − meta do período (negativo = quanto falta). */
  diferenca: number | null;
  projecao: number | null;
  /** Projeção ÷ meta. */
  projecaoSobreMeta: number | null;
  status: StatusMeta;
  margem: number | null;
  metaMargem: number | null;
  /** Margem atual − meta de margem (p.p.). */
  diferencaMargem: number | null;
  statusMargem: StatusMargem;
};

export function resumirMeta(entrada: {
  meta: { meta: number; metaLucro: number } | null;
  metaEsperada: number | null;
  venda: number;
  custo: number;
  periodo: Periodo;
  decorrido: Periodo | null;
}): ResumoMeta {
  const meta = entrada.meta?.meta || null;
  const { venda, custo, metaEsperada, periodo, decorrido } = entrada;
  const proj = projecao(venda, meta, metaEsperada, periodo, decorrido);
  const margem = decorrido && venda ? percentual(venda - custo, venda) : null;
  const metaMargem = meta && entrada.meta ? percentual(entrada.meta.metaLucro, meta) : null;
  return {
    meta,
    metaEsperada,
    realizado: venda,
    atingimento: meta ? percentual(venda, meta) : null,
    diferenca: meta != null ? venda - meta : null,
    projecao: proj,
    projecaoSobreMeta: meta && proj != null ? percentual(proj, meta) : null,
    status: statusMeta(venda, metaEsperada, decorrido),
    margem,
    metaMargem,
    diferencaMargem: diferencaPp(margem, metaMargem),
    statusMargem: statusMargem(margem, metaMargem),
  };
}

export type PontoCumprimento = {
  data: string;
  /** Venda acumulada até o dia (só até a referência). */
  realizado: number | null;
  /** Meta acumulada esperada até o dia. */
  meta: number | null;
  /** Projeção de fechamento (da referência ao fim do mês). */
  projecao: number | null;
};

/**
 * Curvas acumuladas do mês: realizado até a referência, meta esperada no mês
 * inteiro e a projeção a partir da referência (mesmo ritmo da meta ou, sem
 * meta, a média diária).
 */
export function curvaCumprimento(
  mes: Periodo,
  referencia: string,
  metas: MetaDia[],
  realizados: RealizadoDia[],
): PontoCumprimento[] {
  const metaPorDia = new Map(metas.map((m) => [m.data, m.meta]));
  const vendaPorDia = new Map(realizados.map((r) => [r.data, r.venda]));
  const temMeta = metas.some((m) => m.data >= mes.inicio && m.data <= mes.fim && m.meta > 0);

  let metaAcumulada = 0;
  let realizadoAcumulado = 0;
  const pontos = eachDay(mes).map((data) => {
    metaAcumulada += metaPorDia.get(data) ?? 0;
    if (data <= referencia) realizadoAcumulado += vendaPorDia.get(data) ?? 0;
    return { data, metaAcumulada, realizadoAcumulado };
  });

  const naReferencia = pontos.find((p) => p.data === referencia);
  const diasDecorridos = pontos.filter((p) => p.data <= referencia).length;
  const ritmo =
    naReferencia && temMeta && naReferencia.metaAcumulada > 0
      ? naReferencia.realizadoAcumulado / naReferencia.metaAcumulada
      : null;
  const mediaDiaria = naReferencia && diasDecorridos ? naReferencia.realizadoAcumulado / diasDecorridos : 0;

  return pontos.map((p, i) => {
    const depois = naReferencia && p.data >= referencia;
    let proj: number | null = null;
    if (depois) {
      proj =
        ritmo != null
          ? naReferencia.realizadoAcumulado + (p.metaAcumulada - naReferencia.metaAcumulada) * ritmo
          : naReferencia.realizadoAcumulado + mediaDiaria * (i + 1 - diasDecorridos);
    }
    return {
      data: p.data,
      realizado: p.data <= referencia ? p.realizadoAcumulado : null,
      meta: temMeta ? p.metaAcumulada : null,
      projecao: proj,
    };
  });
}
