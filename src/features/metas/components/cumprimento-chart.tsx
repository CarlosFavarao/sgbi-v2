"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { propsEixoX, propsEixoY, propsGrade } from "@/components/charts/estilo";
import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
import { LegendaGrafico, type ItemLegenda } from "@/components/charts/legenda-grafico";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatDiaMes, formatMesAno, formatMoeda, formatMoedaCompacta, formatPercentual } from "@/lib/format";
import type { PontoCumprimento } from "../compute";

const SERIES = [
  { chave: "realizado", nome: "Realizado acumulado", cor: "var(--chart-1)" },
  { chave: "meta", nome: "Meta acumulada", cor: "var(--muted-foreground)" },
  { chave: "projecao", nome: "Projeção", cor: "var(--chart-5)" },
] as const;

function CumprimentoPlot({
  pontos,
  referencia,
  detalhado,
}: {
  pontos: PontoCumprimento[];
  referencia: string;
  /** Gráfico da janela ampliada: eixos e marcações mais detalhados. */
  detalhado: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...propsGrade(detalhado)} />
        <XAxis
          dataKey="data"
          tickFormatter={(d: string) => (detalhado ? formatDiaMes(d) : d.slice(8, 10))}
          {...propsEixoX(detalhado)}
        />
        <YAxis tickFormatter={formatMoedaCompacta} {...propsEixoY(detalhado)} width={detalhado ? 96 : 84} />
        <ReferenceLine
          x={referencia}
          stroke="var(--primary)"
          strokeDasharray="3 3"
          label={{ value: "Ref.", position: "insideTopLeft", fill: "var(--primary)", fontSize: 10 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as PontoCumprimento | undefined;
            if (!active || !p) return null;
            const base = p.realizado ?? p.projecao;
            const diferenca = base != null && p.meta != null ? base - p.meta : null;
            return (
              <div className="min-w-52 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                <div className="mb-1 font-semibold">
                  {formatDiaMes(p.data)}
                  {p.data === referencia && " (referência)"}
                </div>
                {SERIES.map((s) =>
                  p[s.chave] == null ? null : (
                    <div key={s.chave} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ background: s.cor }} />
                        {s.nome}
                      </span>
                      <span className="font-semibold tabular-nums">{formatMoeda(p[s.chave])}</span>
                    </div>
                  ),
                )}
                {diferenca != null && (
                  <div className="mt-1 flex justify-between gap-4 border-t pt-1">
                    <span className="text-muted-foreground">Diferença</span>
                    <span className={`font-semibold tabular-nums ${diferenca >= 0 ? "text-success" : "text-error"}`}>
                      {formatMoeda(diferenca)} ({formatPercentual(p.meta ? (diferenca / p.meta) * 100 : null)})
                    </span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <Line
          dataKey="meta"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="projecao"
          stroke="var(--chart-5)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="realizado"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: detalhado ? 3.5 : 2.5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 1.5 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Venda acumulada do mês até a referência, meta acumulada esperada (curva da
 * meta diária) e projeção de fechamento a partir da referência.
 */
export function CumprimentoChart({
  mes,
  referencia,
  pontos,
  carregando,
}: {
  mes: string;
  referencia: string;
  pontos: PontoCumprimento[];
  carregando: boolean;
}) {
  const temDados = pontos.some((p) => p.realizado || p.meta);
  const temMeta = pontos.some((p) => p.meta);
  const legenda: ItemLegenda[] = SERIES.filter((s) => temMeta || s.chave !== "meta").map((s) => ({
    nome: s.nome,
    cor: s.cor,
    forma: s.chave === "realizado" ? "linha" : "tracejada",
  }));
  const titulo = `Evolução do Cumprimento da Meta · ${formatMesAno(mes)}`;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{titulo}</CardTitle>
          <LegendaGrafico itens={legenda} />
        </div>
        <ExpandirGrafico
          titulo={titulo}
          descricao="Venda acumulada do mês, meta acumulada esperada e projeção de fechamento."
          legenda={<LegendaGrafico itens={legenda} grande />}
          desabilitado={!temDados}
        >
          <CumprimentoPlot pontos={pontos} referencia={referencia} detalhado />
        </ExpandirGrafico>
      </CardHeader>

      <div className="relative h-32 px-1 pb-2 pt-1" aria-busy={carregando}>
        {!temDados ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem venda nem meta no mês
            </div>
          )
        ) : (
          <CumprimentoPlot pontos={pontos} referencia={referencia} detalhado={false} />
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
