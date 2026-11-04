import { PAINEL_CONFIG } from "./config";
import { eachDay, startOfWeek } from "./date";
import { formatDecimal, formatMoeda } from "./format";
import type { Dia, Granularidade, LinhaNivel, Periodo, PontoSerie, ResumoResponse, SerieResponse } from "./types";

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

/** a / b × 100, ou null quando o divisor é zero. */
export function percentual(a: number, b: number): number | null {
  return b ? (a / b) * 100 : null;
}

/** Variação % de `atual` sobre `anterior`. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || !anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function diferencaPp(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null) return null;
  return atual - anterior;
}

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

export type PontoEvolucao = {
  /** Rótulo do eixo X (início do intervalo do período atual). */
  chave: string;
  dataAtual: string | null;
  dataAnterior: string | null;
  vendaAtual: number | null;
  vendaAnterior: number | null;
  margemAtual: number | null;
  margemAnterior: number | null;
};

function chaveDe(data: string, granularidade: Granularidade) {
  if (granularidade === "semana") return startOfWeek(data);
  if (granularidade === "mes") return data.slice(0, 7);
  return data;
}

function agrupar(dias: Dia[], granularidade: Granularidade) {
  const grupos = new Map<string, Dia[]>();
  for (const dia of dias) {
    const chave = chaveDe(dia.data, granularidade);
    grupos.set(chave, [...(grupos.get(chave) ?? []), dia]);
  }
  return [...grupos.entries()].map(([chave, itens]) => {
    const t = totais(itens);
    const temVenda = t.cobertura.venda > 0;
    return {
      chave,
      inicio: itens[0].data,
      venda: temVenda ? t.venda : null,
      margem: temVenda ? percentual(t.venda - t.custo, t.venda) : null,
    };
  });
}

/** Atual e anterior alinhados pela posição do intervalo (1º dia com 1º dia...). */
export function evolucao(resumo: ResumoResponse, granularidade: Granularidade): PontoEvolucao[] {
  const atual = agrupar(resumo.atual.dias, granularidade);
  const anterior = agrupar(resumo.anterior.dias, granularidade);
  const tamanho = Math.max(atual.length, anterior.length);

  return Array.from({ length: tamanho }, (_, i) => ({
    chave: atual[i]?.inicio ?? anterior[i].inicio,
    dataAtual: atual[i]?.inicio ?? null,
    dataAnterior: anterior[i]?.inicio ?? null,
    vendaAtual: atual[i]?.venda ?? null,
    vendaAnterior: anterior[i]?.venda ?? null,
    margemAtual: atual[i]?.margem ?? null,
    margemAnterior: anterior[i]?.margem ?? null,
  }));
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
