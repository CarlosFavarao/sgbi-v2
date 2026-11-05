"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
import { escala, propsEixoX, propsEixoY, propsGrade } from "@/components/charts/estilo";
import { LegendaGrafico, type ItemLegenda } from "@/components/charts/legenda-grafico";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import type { Granularidade } from "@/lib/filtros";
import { formatDiaMes, formatMesAno } from "@/lib/format";
import type { PontoComparativo } from "@/lib/serie";

const GRANULARIDADES: { value: Granularidade; label: string }[] = [
  { value: "dia", label: "Diária" },
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
];

function rotulo(data: string | null, granularidade: Granularidade) {
  if (!data) return "—";
  if (granularidade === "mes") return formatMesAno(data.slice(0, 7));
  if (granularidade === "semana") return `sem. ${formatDiaMes(data)}`;
  return formatDiaMes(data);
}

type PlotProps = {
  dados: PontoComparativo[];
  granularidade: Granularidade;
  nomeAtual: string;
  cor: string;
  formatValor: (value: number) => string;
  formatEixo: (value: number) => string;
  larguraEixo: number;
  eixoDesdeZero: boolean;
  /** Gráfico da janela ampliada: eixos e marcações mais detalhados. */
  detalhado: boolean;
};

function EvolucaoPlot({
  dados,
  granularidade,
  nomeAtual,
  cor,
  formatValor,
  formatEixo,
  larguraEixo,
  eixoDesdeZero,
  detalhado,
}: PlotProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...propsGrade(detalhado)} />
        <XAxis
          dataKey="chave"
          tickFormatter={(chave: string) => rotulo(chave, granularidade)}
          {...propsEixoX(detalhado)}
        />
        <YAxis
          tickFormatter={formatEixo}
          {...propsEixoY(detalhado)}
          width={detalhado ? larguraEixo + 12 : larguraEixo}
          domain={eixoDesdeZero ? [0, "auto"] : undefined}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          content={({ active, payload }) => {
            const ponto = payload?.[0]?.payload as PontoComparativo | undefined;
            if (!active || !ponto) return null;
            const { atual, anterior } = ponto;
            return (
              <div className="min-w-44 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: cor }} />
                    {rotulo(ponto.dataAtual, granularidade)}
                  </span>
                  <span className="font-semibold tabular-nums">{atual != null ? formatValor(atual) : "sem dados"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ background: cor, opacity: 0.3 }} />
                    {rotulo(ponto.dataAnterior, granularidade)}
                  </span>
                  <span className="tabular-nums">{anterior != null ? formatValor(anterior) : "sem dados"}</span>
                </div>
              </div>
            );
          }}
        />
        <Bar
          dataKey="anterior"
          name="Período anterior"
          fill={cor}
          fillOpacity={0.28}
          radius={[4, 4, 0, 0]}
          maxBarSize={28 * escala(detalhado).barra}
          isAnimationActive={false}
        />
        <Line
          dataKey="atual"
          name={nomeAtual}
          type="monotone"
          stroke={cor}
          strokeWidth={2}
          dot={{ r: escala(detalhado).ponto, fill: cor, stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: escala(detalhado).pontoAtivo, stroke: "var(--card)", strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * Período atual (linha) sobre o período de comparação (barras claras), mesma
 * escala. As duas séries medem a mesma coisa: um único eixo Y. O card tem o
 * seletor de agrupamento (diário, semanal, mensal).
 */
export function EvolucaoChart({
  titulo,
  nomeAtual,
  cor,
  formatValor,
  formatEixo,
  larguraEixo = 84,
  eixoDesdeZero = false,
  pontos,
  carregando,
  className = "",
  alturaGrafico = "h-44",
}: {
  titulo: string;
  /** Legenda da série atual (ex.: "Venda atual"). */
  nomeAtual: string;
  /** Cor da série (token CSS, ex.: var(--chart-1)). */
  cor: string;
  formatValor: (value: number) => string;
  formatEixo: (value: number) => string;
  larguraEixo?: number;
  /** Eixo Y começa em zero (ex.: percentuais). */
  eixoDesdeZero?: boolean;
  /** Pontos já agrupados na granularidade escolhida no card. */
  pontos: (granularidade: Granularidade) => PontoComparativo[];
  carregando: boolean;
  className?: string;
  /** Altura da área do gráfico (classe Tailwind). */
  alturaGrafico?: string;
}) {
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const dados = pontos(granularidade);
  const temDados = dados.some((d) => !!d.atual || !!d.anterior);
  const legenda: ItemLegenda[] = [
    { nome: nomeAtual, cor, forma: "circulo" },
    { nome: "Período anterior", cor, opacidade: 0.3 },
  ];
  const plot = { dados, granularidade, nomeAtual, cor, formatValor, formatEixo, larguraEixo, eixoDesdeZero };

  return (
    <Card className={`min-w-0 ${className}`}>
      <CardHeader>
        <div>
          <CardTitle>{titulo}</CardTitle>
          <LegendaGrafico itens={legenda} />
        </div>
        <div className="flex items-center gap-1.5">
          <Select
            aria-label={`Agrupamento de ${titulo}`}
            className="w-32"
            value={granularidade}
            options={GRANULARIDADES}
            onValueChange={setGranularidade}
          />
          <ExpandirGrafico
            titulo={titulo}
            descricao={`${nomeAtual} contra o período anterior, em agrupamento ${GRANULARIDADES.find((g) => g.value === granularidade)!.label.toLowerCase()}.`}
            legenda={<LegendaGrafico itens={legenda} grande />}
            desabilitado={!temDados}
          >
            <EvolucaoPlot {...plot} detalhado />
          </ExpandirGrafico>
        </div>
      </CardHeader>

      <div className={`relative ${alturaGrafico} px-1 pb-2 pt-1`} aria-busy={carregando}>
        {carregando && !temDados ? (
          <div className="h-full" />
        ) : !temDados ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados no período
          </div>
        ) : (
          <EvolucaoPlot {...plot} detalhado={false} />
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
