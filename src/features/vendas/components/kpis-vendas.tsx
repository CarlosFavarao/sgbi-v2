"use client";

import {
  mdiBasketOutline,
  mdiCartOutline,
  mdiChartBar,
  mdiPercentOutline,
  mdiReceiptTextOutline,
  mdiSackOutline,
} from "@mdi/js";
import { corDoTom, Delta, KpiCard, SemDados, type Tom } from "@/components/kpi/kpi-card";
import { Sparkline } from "@/components/kpi/sparkline";
import { formatDecimal, formatInteiro, formatMoeda, formatPercentual } from "@/lib/format";
import { diferencaPp, indicadores, serieDiaria, variacao, type IndicadoresVendas, type ResumoVendas } from "../compute";

type Kpi = {
  titulo: string;
  ajuda: string;
  icone: string;
  tom: Tom;
  /** Fonte dos dados: "vendas" (analise gerencial) ou "cupons" (logpdv, só PDV). */
  fonte: "vendas" | "cupons";
  valor: (i: IndicadoresVendas) => number | null;
  format: (v: number) => string;
  /** Variação em % ou em p.p. (percentuais). */
  unidade: "%" | "pp";
  grafico: "bar" | "area";
};

const KPIS: Kpi[] = [
  {
    titulo: "Venda",
    ajuda: "Soma da venda (PDV e/ou faturamento, conforme a Origem) no período.",
    icone: mdiChartBar,
    tom: "green",
    fonte: "vendas",
    valor: (i) => i.venda,
    format: formatMoeda,
    unidade: "%",
    grafico: "bar",
  },
  {
    titulo: "Margem Bruta",
    ajuda: "Lucro bruto dividido pela venda. Variação em pontos percentuais.",
    icone: mdiPercentOutline,
    tom: "pink",
    fonte: "vendas",
    valor: (i) => i.margem,
    format: formatPercentual,
    unidade: "pp",
    grafico: "area",
  },
  {
    titulo: "Lucro Bruto",
    ajuda: "Venda menos o custo da mercadoria vendida.",
    icone: mdiSackOutline,
    tom: "gold",
    fonte: "vendas",
    valor: (i) => i.lucro,
    format: formatMoeda,
    unidade: "%",
    grafico: "bar",
  },
  {
    titulo: "Ticket Médio",
    ajuda: "Venda do PDV dividida pela quantidade de cupons (logpdv). Não inclui o faturamento.",
    icone: mdiCartOutline,
    tom: "teal",
    fonte: "cupons",
    valor: (i) => i.ticketMedio,
    format: formatMoeda,
    unidade: "%",
    grafico: "area",
  },
  {
    titulo: "Cupons",
    ajuda: "Quantidade de cupons emitidos no PDV (logpdv).",
    icone: mdiReceiptTextOutline,
    tom: "blue",
    fonte: "cupons",
    valor: (i) => (i.cobertura.cupons ? i.cupons : null),
    format: formatInteiro,
    unidade: "%",
    grafico: "bar",
  },
  {
    titulo: "Itens por Cupom",
    ajuda: "Quantidade vendida (unidades e kg) dividida pelos cupons do PDV, como a cesta média do BI antigo.",
    icone: mdiBasketOutline,
    tom: "purple",
    fonte: "cupons",
    valor: (i) => i.itensPorCupom,
    format: formatDecimal,
    unidade: "%",
    grafico: "area",
  },
];

export function KpisVendas({
  resumo,
  carregando,
}: {
  resumo: ResumoVendas;
  /** Cada card espera só a sua fonte. */
  carregando: Record<"vendas" | "cupons", boolean>;
}) {
  const dias = resumo.atual.dias;
  const a = indicadores(dias);
  const b = indicadores(resumo.anterior.dias);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KPIS.map((kpi) => {
        const campoBase = kpi.fonte === "vendas" ? "venda" : "cupons";
        // Venda zerada (ex.: origem Faturamento sem notas) conta como "sem dados".
        const temAtual = a.cobertura[campoBase] > 0 && a[campoBase] !== 0;
        const temAnterior = b.cobertura[campoBase] > 0 && b[campoBase] !== 0;
        const atual = temAtual ? kpi.valor(a) : null;
        const anterior = temAnterior ? kpi.valor(b) : null;
        return (
          <KpiCard
            key={kpi.titulo}
            titulo={kpi.titulo}
            ajuda={kpi.ajuda}
            icone={kpi.icone}
            tom={kpi.tom}
            badge={kpi.fonte === "cupons" ? "PDV" : undefined}
            carregando={carregando[kpi.fonte]}
            valor={atual != null ? kpi.format(atual) : <SemDados>Sem dados no período</SemDados>}
            linhas={
              atual != null &&
              (anterior != null ? (
                <>
                  <Delta
                    value={kpi.unidade === "pp" ? diferencaPp(atual, anterior) : variacao(atual, anterior)}
                    unidade={kpi.unidade}
                    maiorMelhor
                  />
                  <span className="whitespace-nowrap tabular-nums">vs {kpi.format(anterior)}</span>
                </>
              ) : (
                <span>sem dados no período anterior</span>
              ))
            }
            grafico={
              <Sparkline
                label={kpi.titulo}
                kind={kpi.grafico}
                color={corDoTom(kpi.tom)}
                format={kpi.format}
                data={serieDiaria(dias, kpi.valor, campoBase)}
              />
            }
          />
        );
      })}
    </div>
  );
}
