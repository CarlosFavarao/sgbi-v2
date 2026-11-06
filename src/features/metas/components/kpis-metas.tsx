"use client";

import type { ItemDoBloco } from "@/components/layout/bloco-kpis";
import {
  mdiBullseyeArrow,
  mdiCartOutline,
  mdiChartBar,
  mdiCheckDecagramOutline,
  mdiChartLineVariant,
  mdiTargetAccount,
} from "@mdi/js";
import type { ReactNode } from "react";
import { corDoTom, Delta, KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { Sparkline } from "@/components/kpi/sparkline";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { diferencaPp, type ResumoMeta } from "../compute";
import type { AbaPeriodo } from "../types";
import { StatusMetaBadge } from "./status";

/** "do Dia", "da Semana"... para os títulos dos cards. */
export const DO_PERIODO: Record<AbaPeriodo, string> = {
  dia: "do Dia",
  semana: "da Semana",
  quinzena1: "da 1ª Quinzena",
  quinzena2: "da 2ª Quinzena",
  mes: "do Mês",
  ano: "do Ano",
};

export type Comparativo = {
  meta: number | null;
  realizado: number | null;
  atingimento: number | null;
  diferenca: number | null;
};

type Serie = { data: string; valor: number | null }[];

function Vs({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      vs {children} ({rotulo})
    </span>
  );
}

/** Variação em R$ (para a diferença para a meta, que pode ser negativa). */
function DeltaMoeda({ value }: { value: number | null }) {
  if (value == null) return null;
  const cor = Math.abs(value) < 0.005 ? "text-muted-foreground" : value > 0 ? "text-success" : "text-error";
  return (
    <span className={`whitespace-nowrap text-xs font-semibold tabular-nums ${cor}`}>
      {value > 0 ? "+" : ""}
      {formatMoeda(value)}
    </span>
  );
}

/** KPIs da tela de Metas (o `BlocoKpis` da grade personalizável monta a grade deles). */
export function kpisDasMetas({
  aba,
  resumo,
  comparativo,
  rotuloComparacao,
  series,
  carregando,
}: {
  aba: AbaPeriodo;
  resumo: ResumoMeta;
  comparativo: Comparativo | null;
  rotuloComparacao: string;
  /** Séries diárias da parte decorrida (vazias no Dia e no Ano). */
  series: { meta: Serie; realizado: Serie; atingimento: Serie };
  carregando: { meta: boolean; realizado: boolean };
}): ItemDoBloco[] {
  const r = resumo;
  const c = comparativo;
  const semMeta = <SemDados>Sem meta cadastrada</SemDados>;
  const aguardando = r.status === "aguardando";
  const periodo = DO_PERIODO[aba];
  const mostrarSerie = aba !== "dia" && aba !== "ano";

  return [
    {
      id: "meta",
      titulo: `Meta ${periodo}`,
      node: (
        <KpiCard
          titulo={`Meta ${periodo}`}
          ajuda="Meta de venda do período inteiro (soma da meta diária da loja ou, com filtro de departamento, a meta mensal dele distribuída pelos dias)."
          icone={mdiBullseyeArrow}
          tom="green"
          carregando={carregando.meta}
          valor={r.meta != null ? formatMoeda(r.meta) : semMeta}
          linhas={
            r.meta != null &&
            c?.meta != null && (
              <>
                <Delta value={c.meta ? ((r.meta - c.meta) / c.meta) * 100 : null} unidade="%" maiorMelhor />
                <Vs rotulo={rotuloComparacao}>{formatMoeda(c.meta)}</Vs>
              </>
            )
          }
          grafico={
            mostrarSerie && (
              <Sparkline
                label={`Meta ${periodo}`}
                kind="bar"
                color={corDoTom("green")}
                format={formatMoeda}
                data={series.meta}
              />
            )
          }
        />
      ),
    },
    {
      id: "realizado",
      titulo: "Venda Realizada",
      node: (
        <KpiCard
          titulo="Venda Realizada"
          ajuda="Venda até a data de referência (último dia carregado), conforme a Origem."
          icone={mdiCartOutline}
          tom="blue"
          carregando={carregando.realizado}
          valor={aguardando ? <SemDados>Aguardando</SemDados> : formatMoeda(r.realizado)}
          linhas={
            !aguardando &&
            c?.realizado != null && (
              <>
                <Delta
                  value={c.realizado ? ((r.realizado - c.realizado) / c.realizado) * 100 : null}
                  unidade="%"
                  maiorMelhor
                />
                <Vs rotulo={rotuloComparacao}>{formatMoeda(c.realizado)}</Vs>
              </>
            )
          }
          grafico={
            mostrarSerie && (
              <Sparkline
                label="Venda Realizada"
                kind="bar"
                color={corDoTom("blue")}
                format={formatMoeda}
                data={series.realizado}
              />
            )
          }
        />
      ),
    },
    {
      id: "atingimento",
      titulo: "Atingimento da Meta",
      node: (
        <KpiCard
          titulo="Atingimento da Meta"
          ajuda="Venda realizada dividida pela meta do período inteiro. Variação em pontos percentuais contra o mesmo ponto do período de comparação."
          icone={mdiCheckDecagramOutline}
          tom="teal"
          carregando={carregando.meta || carregando.realizado}
          valor={r.atingimento != null ? formatPercentual(r.atingimento) : semMeta}
          linhas={
            r.atingimento != null &&
            c?.atingimento != null && (
              <>
                <Delta value={diferencaPp(r.atingimento, c.atingimento)} unidade="pp" maiorMelhor />
                <Vs rotulo={rotuloComparacao}>{formatPercentual(c.atingimento)}</Vs>
              </>
            )
          }
          grafico={
            mostrarSerie && (
              <Sparkline
                label="Atingimento diário"
                kind="area"
                color={corDoTom("teal")}
                format={formatPercentual}
                data={series.atingimento}
              />
            )
          }
        />
      ),
    },
    {
      id: "diferenca",
      titulo: "Diferença para a Meta",
      node: (
        <KpiCard
          titulo="Diferença para a Meta"
          ajuda="Venda realizada menos a meta do período inteiro. Negativa = quanto ainda falta vender."
          icone={mdiChartBar}
          tom="gold"
          carregando={carregando.meta || carregando.realizado}
          valor={r.diferenca != null ? formatMoeda(r.diferenca) : semMeta}
          linhas={
            r.diferenca != null &&
            c?.diferenca != null && (
              <>
                <DeltaMoeda value={r.diferenca - c.diferenca} />
                <Vs rotulo={rotuloComparacao}>{formatMoeda(c.diferenca)}</Vs>
              </>
            )
          }
        />
      ),
    },
    {
      id: "projecao",
      titulo: `Projeção ${periodo}`,
      node: (
        <KpiCard
          titulo={`Projeção ${periodo}`}
          ajuda="Fechamento esperado se o ritmo atual continuar: realizado ÷ meta esperada até hoje × meta do período. Sem meta, usa a média diária da venda."
          icone={mdiChartLineVariant}
          tom="purple"
          carregando={carregando.meta || carregando.realizado}
          valor={r.projecao != null ? formatMoeda(r.projecao) : <SemDados>Aguardando</SemDados>}
          linhas={
            r.projecaoSobreMeta != null && (
              <span className="tabular-nums">
                <span className={`font-semibold ${r.projecaoSobreMeta >= 100 ? "text-success" : "text-error"}`}>
                  {formatPercentual(r.projecaoSobreMeta)}
                </span>{" "}
                da meta
              </span>
            )
          }
        />
      ),
    },
    {
      id: "status",
      titulo: `Status ${periodo}`,
      node: (
        <KpiCard
          titulo={`Status ${periodo}`}
          ajuda="Venda realizada contra a meta esperada até a data de referência (ritmo). Os limites ficam em src/features/metas/config.ts."
          icone={mdiTargetAccount}
          tom="orange"
          carregando={carregando.meta || carregando.realizado}
          valor={
            <span className="inline-flex pt-0.5">
              <StatusMetaBadge status={r.status} destaque />
            </span>
          }
          linhas={
            r.metaEsperada != null &&
            !aguardando && <span className="tabular-nums">Ritmo esperado: {formatMoeda(r.metaEsperada)}</span>
          }
        />
      ),
    },
  ];
}
