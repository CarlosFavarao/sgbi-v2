import { diferencaPp, percentual, variacao } from "@/lib/calc";
import { PAINEL_CONFIG } from "./config";
import { eachDay } from "@/lib/date";
import { formatDecimal, formatMoeda } from "@/lib/format";
import type { Dia, LinhaNivel, Periodo, PontoSerie, ResumoResponse, SerieResponse } from "./types";

type Campo = Exclude<keyof Dia, "data">;

function preencher(periodo: Periodo, series: (PontoSerie[] | undefined)[]): Dia[] {
  const porDia = new Map<string, PontoSerie>();
  for (const serie of series) {
    for (const ponto of serie ?? []) porDia.set(ponto.data, { ...porDia.get(ponto.data), ...ponto });
  }
  return eachDay(periodo).map((data) => {
    const p = porDia.get(data);
    return {
      data,
      venda: p?.venda ?? null,
      custo: p?.custo ?? null,
      compra: p?.compra ?? null,
      vendaPdv: p?.vendaPdv ?? null,
      tickets: p?.tickets ?? null,
      cancelamentos: p?.cancelamentos ?? null,
      despesas: p?.despesas ?? null,
    };
  });
}

/** Combina as fontes já carregadas; campos de fontes pendentes ficam null. */
export function combinarSeries(
  periodo: Periodo,
  periodoAnterior: Periodo,
  series: (SerieResponse | undefined)[],
): ResumoResponse {
  return {
    atual: { periodo, dias: preencher(periodo, series.map((s) => s?.atual)) },
    anterior: { periodo: periodoAnterior, dias: preencher(periodoAnterior, series.map((s) => s?.anterior)) },
  };
}

export type Totais = Record<Campo, number> & {
  /** Dias com carga para cada campo; 0 = sem dados no período. */
  cobertura: Record<Campo, number>;
};

const CAMPOS: Campo[] = [
  "venda",
  "custo",
  "compra",
  "vendaPdv",
  "tickets",
  "cancelamentos",
  "despesas",
];

export function totais(dias: Dia[]): Totais {
  const result = { cobertura: {} } as Totais;
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
    result[campo] = total;
    result.cobertura[campo] = cobertura;
  }
  return result;
}

export { diferencaPp, percentual, variacao };

export type Indicadores = {
  venda: number;
  lucro: number;
  margem: number | null;
  compra: number;
  compraSobreVenda: number | null;
  vendaPdv: number;
  tickets: number;
  ticketMedio: number | null;
  cancelamentos: number;
  cancelamentosSobreVenda: number | null;
  despesas: number;
  despesasSobreVenda: number | null;
  resultado: number;
  resultadoSobreVenda: number | null;
  cobertura: Totais["cobertura"];
};

export function indicadores(dias: Dia[]): Indicadores {
  const t = totais(dias);
  const lucro = t.venda - t.custo;
  const resultado = lucro - t.despesas;
  return {
    venda: t.venda,
    lucro,
    margem: percentual(lucro, t.venda),
    compra: t.compra,
    compraSobreVenda: percentual(t.compra, t.venda),
    vendaPdv: t.vendaPdv,
    tickets: t.tickets,
    ticketMedio: t.tickets ? t.vendaPdv / t.tickets : null,
    cancelamentos: t.cancelamentos,
    // Cancelamentos são do PDV: base = venda PDV.
    cancelamentosSobreVenda: percentual(t.cancelamentos, t.vendaPdv),
    despesas: t.despesas,
    despesasSobreVenda: percentual(t.despesas, t.venda),
    resultado,
    resultadoSobreVenda: percentual(resultado, t.venda),
    cobertura: t.cobertura,
  };
}

/** Série diária de um indicador para os sparklines (null = sem carga). */
export function serieDiaria(
  dias: Dia[],
  fn: (indicador: Indicadores) => number | null,
  campoBase: Campo,
): { data: string; valor: number | null }[] {
  return dias.map((dia) => ({
    data: dia.data,
    valor: dia[campoBase] == null ? null : fn(indicadores([dia])),
  }));
}

/** Medidas do gráfico de evolução: null quando nenhum dia do intervalo tem venda carregada. */
export function vendaDoIntervalo(dias: Dia[]): number | null {
  const t = totais(dias);
  return t.cobertura.venda ? t.venda : null;
}

export function margemDoIntervalo(dias: Dia[]): number | null {
  const t = totais(dias);
  return t.cobertura.venda ? percentual(t.venda - t.custo, t.venda) : null;
}

export type Situacao = "bom" | "atencao" | "critico";

/** Pela variação absoluta, em p.p., da compra sobre venda (config.ts). */
export function situacao(variacaoPp: number | null): Situacao | null {
  if (variacaoPp == null) return null;
  const { bomAtePp, atencaoAtePp } = PAINEL_CONFIG.situacao;
  const abs = Math.abs(variacaoPp);
  if (abs <= bomAtePp) return "bom";
  if (abs <= atencaoAtePp) return "atencao";
  return "critico";
}

export type LinhaCalculada = LinhaNivel & {
  variacaoCompra: number | null;
  variacaoVenda: number | null;
  compraSobreVenda: number | null;
  compraSobreVendaAnterior: number | null;
  variacaoPp: number | null;
  situacao: Situacao | null;
};

export function calcularLinha(linha: LinhaNivel): LinhaCalculada {
  const compraSobreVenda = percentual(linha.compra, linha.venda);
  const compraSobreVendaAnterior = percentual(linha.compraAnterior, linha.vendaAnterior);
  const variacaoPp = diferencaPp(compraSobreVenda, compraSobreVendaAnterior);
  return {
    ...linha,
    variacaoCompra: variacao(linha.compra, linha.compraAnterior),
    variacaoVenda: variacao(linha.venda, linha.vendaAnterior),
    compraSobreVenda,
    compraSobreVendaAnterior,
    variacaoPp,
    situacao: situacao(variacaoPp),
  };
}

export type Alerta = {
  id: string;
  tipo: "compra-alta" | "compra-baixa" | "margem" | "despesa" | "cancelamento" | "desconto";
  titulo: string;
  detalhe: string;
};

export function alertas(
  atual: Indicadores,
  anterior: Indicadores,
  departamentos: LinhaCalculada[],
): Alerta[] {
  const regras = PAINEL_CONFIG.alertas;
  const lista: Alerta[] = [];

  if (regras.departamentoCritico) {
    for (const d of departamentos) {
      if (d.situacao !== "critico" || d.variacaoPp == null) continue;
      lista.push({
        id: `departamento-${d.codigo}`,
        tipo: d.variacaoPp > 0 ? "compra-alta" : "compra-baixa",
        titulo: `${d.descricao}: compra sobre venda ${d.variacaoPp > 0 ? "subiu" : "caiu"} ${formatDecimal(Math.abs(d.variacaoPp))} p.p.`,
        detalhe: `${formatDecimal(d.compraSobreVenda ?? 0)}% vs ${formatDecimal(d.compraSobreVendaAnterior ?? 0)}% no período anterior`,
      });
    }
  }

  const margemPp = diferencaPp(atual.margem, anterior.margem);
  if (margemPp != null && margemPp <= -regras.quedaMargemPp) {
    lista.push({
      id: "margem",
      tipo: "margem",
      titulo: `Margem bruta ${formatDecimal(Math.abs(margemPp))} p.p. abaixo do período anterior`,
      detalhe: `${formatDecimal(atual.margem!)}% vs ${formatDecimal(anterior.margem!)}%`,
    });
  }

  if (atual.cobertura.despesas && anterior.cobertura.despesas) {
    const despesaPp = diferencaPp(atual.despesasSobreVenda, anterior.despesasSobreVenda);
    if (despesaPp != null && despesaPp >= regras.aumentoDespesaSobreVendaPp) {
      lista.push({
        id: "despesas",
        tipo: "despesa",
        titulo: `Despesas operacionais ${formatDecimal(despesaPp)} p.p. acima do período anterior`,
        detalhe: `${formatDecimal(atual.despesasSobreVenda!)}% da venda vs ${formatDecimal(anterior.despesasSobreVenda!)}%`,
      });
    }
  }

  if (atual.cobertura.cancelamentos && anterior.cobertura.cancelamentos) {
    const variacaoCancel = variacao(atual.cancelamentos, anterior.cancelamentos);
    if (variacaoCancel != null && variacaoCancel >= regras.aumentoCancelamentosPct) {
      lista.push({
        id: "cancelamentos",
        tipo: "cancelamento",
        titulo: `Cancelamentos aumentaram ${formatDecimal(variacaoCancel)}%`,
        detalhe: `${formatMoeda(atual.cancelamentos)} vs ${formatMoeda(anterior.cancelamentos)} no período anterior`,
      });
    }
  }

  return lista;
}
