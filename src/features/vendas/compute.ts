import { diferencaPp, percentual, variacao } from "@/lib/calc";
import { eachDay } from "@/lib/date";
import type {
  DiaVendas,
  LinhaCuponsNivel,
  LinhaVendaNivel,
  Periodo,
  PontoVendas,
  SerieVendasResponse,
} from "./types";

type Campo = Exclude<keyof DiaVendas, "data">;
const CAMPOS: Campo[] = ["venda", "custo", "vendaPdv", "cupons", "itens"];

function preencher(periodo: Periodo, series: (PontoVendas[] | undefined)[]): DiaVendas[] {
  const porDia = new Map<string, PontoVendas>();
  for (const serie of series) {
    for (const ponto of serie ?? []) porDia.set(ponto.data, { ...porDia.get(ponto.data), ...ponto });
  }
  return eachDay(periodo).map((data) => {
    const p = porDia.get(data);
    return {
      data,
      venda: p?.venda ?? null,
      custo: p?.custo ?? null,
      vendaPdv: p?.vendaPdv ?? null,
      cupons: p?.cupons ?? null,
      itens: p?.itens ?? null,
    };
  });
}

export type ResumoVendas = {
  atual: { periodo: Periodo; dias: DiaVendas[] };
  anterior: { periodo: Periodo; dias: DiaVendas[] };
};

/** Combina as fontes já carregadas; campos de fontes pendentes ficam null. */
export function combinarSeries(
  periodo: Periodo,
  anterior: Periodo,
  series: (SerieVendasResponse | undefined)[],
): ResumoVendas {
  return {
    atual: { periodo, dias: preencher(periodo, series.map((s) => s?.atual)) },
    anterior: { periodo: anterior, dias: preencher(anterior, series.map((s) => s?.anterior)) },
  };
}

export { diferencaPp, percentual, variacao };

export type IndicadoresVendas = Record<Campo, number> & {
  lucro: number;
  margem: number | null;
  ticketMedio: number | null;
  itensPorCupom: number | null;
  /** Dias com carga em cada campo; 0 = sem dados no período. */
  cobertura: Record<Campo, number>;
};

export function indicadores(dias: DiaVendas[]): IndicadoresVendas {
  const r = { cobertura: {} } as IndicadoresVendas;
  for (const campo of CAMPOS) {
    let total = 0;
    let cobertura = 0;
    for (const dia of dias) {
      const valor = dia[campo];
      if (valor != null) {
        total += valor;
        cobertura++;
      }
    }
    r[campo] = total;
    r.cobertura[campo] = cobertura;
  }
  r.lucro = r.venda - r.custo;
  r.margem = percentual(r.lucro, r.venda);
  // Ticket e itens por cupom: tudo do logpdv (PDV), na mesma base dos cupons.
  r.ticketMedio = r.cupons ? r.vendaPdv / r.cupons : null;
  r.itensPorCupom = r.cupons ? r.itens / r.cupons : null;
  return r;
}

/** Série diária de um indicador para os sparklines (null = sem carga). */
export function serieDiaria(
  dias: DiaVendas[],
  fn: (i: IndicadoresVendas) => number | null,
  campoBase: Campo,
): { data: string; valor: number | null }[] {
  return dias.map((dia) => ({ data: dia.data, valor: dia[campoBase] == null ? null : fn(indicadores([dia])) }));
}

export type LinhaDesempenho = {
  codigo: number;
  descricao: string;
  pai: number | null;
  venda: number;
  variacaoVenda: number | null;
  margem: number | null;
  variacaoMargemPp: number | null;
  lucro: number;
  variacaoLucro: number | null;
  /** undefined = cupons ainda carregando; null = sem cupons no PDV. */
  cupons: number | null | undefined;
  variacaoCupons: number | null | undefined;
  itensPorCupom: number | null | undefined;
  variacaoItensPorCupom: number | null | undefined;
  participacao: number | null;
};

const itensPorCupom = (itens: number, cupons: number) => (cupons ? itens / cupons : null);

/** Uma linha da tabela de desempenho. `cupons` undefined = consulta de cupons pendente. */
export function calcularDesempenho(
  linha: Omit<LinhaVendaNivel, "descricao" | "pai"> & { descricao: string; pai: number | null },
  cupons: LinhaCuponsNivel | null | undefined,
  vendaTotal: number,
): LinhaDesempenho {
  const lucro = linha.venda - linha.custo;
  const lucroAnterior = linha.vendaAnterior - linha.custoAnterior;
  const margem = percentual(lucro, linha.venda);
  const ipc = cupons && itensPorCupom(cupons.itens, cupons.cupons);
  const ipcAnterior = cupons && itensPorCupom(cupons.itensAnterior, cupons.cuponsAnterior);
  return {
    codigo: linha.codigo,
    descricao: linha.descricao,
    pai: linha.pai,
    venda: linha.venda,
    variacaoVenda: variacao(linha.venda, linha.vendaAnterior),
    margem,
    variacaoMargemPp: diferencaPp(margem, percentual(lucroAnterior, linha.vendaAnterior)),
    lucro,
    variacaoLucro: variacao(lucro, lucroAnterior),
    cupons: cupons === undefined ? undefined : (cupons?.cupons ?? null),
    variacaoCupons: cupons === undefined ? undefined : cupons ? variacao(cupons.cupons, cupons.cuponsAnterior) : null,
    itensPorCupom: cupons === undefined ? undefined : (ipc ?? null),
    variacaoItensPorCupom: cupons === undefined ? undefined : cupons ? variacao(ipc ?? null, ipcAnterior ?? null) : null,
    participacao: percentual(linha.venda, vendaTotal),
  };
}
