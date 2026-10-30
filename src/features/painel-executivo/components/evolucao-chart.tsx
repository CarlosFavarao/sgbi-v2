"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { evolucao, type PontoEvolucao } from "../compute";
import { formatDiaMes, formatMesAno } from "../format";
import type { Granularidade, ResumoResponse } from "../types";

type Medida = "venda" | "margem";

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

/**
 * Período atual (linha) sobre o período anterior (barras claras), mesma escala.
 * As duas séries medem a mesma coisa: um único eixo Y.
 */
export function EvolucaoChart({
  titulo,
  medida,
  cor,
  formatValor,
  formatEixo,
  resumo,
  carregando,
}: {
  titulo: string;
  medida: Medida;
  /** Cor da série (token CSS, ex.: var(--chart-1)). */
  cor: string;
  formatValor: (value: number) => string;
  formatEixo: (value: number) => string;
  resumo: ResumoResponse | undefined;
  carregando: boolean;
}) {
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const dados = resumo ? evolucao(resumo, granularidade) : [];
  const atualKey = `${medida}Atual` as const;
  const anteriorKey = `${medida}Anterior` as const;
  const temDados = dados.some((d) => !!d[atualKey] || !!d[anteriorKey]);

  const nomeAtual = medida === "venda" ? "Venda atual" : "Margem atual";

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <CardTitle>{titulo}</CardTitle>
          <ul className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: cor }} />
              {nomeAtual}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: cor, opacity: 0.3 }} />
              Período anterior
            </li>
          </ul>
        </div>
        <Select
          aria-label={`Agrupamento de ${titulo}`}
          className="w-32"
          value={granularidade}
          options={GRANULARIDADES}
          onValueChange={setGranularidade}
        />
      </CardHeader>

      <div className="relative h-44 px-1 pb-2 pt-1" aria-busy={carregando}>
        {carregando && !temDados ? (
          <div className="h-full" />
        ) : !temDados ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="chave"
                tickFormatter={(chave: string) => rotulo(chave, granularidade)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={formatEixo}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={medida === "venda" ? 84 : 44}
                domain={medida === "margem" ? [0, "auto"] : undefined}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={({ active, payload }) => {
                  const ponto = payload?.[0]?.payload as PontoEvolucao | undefined;
                  if (!active || !ponto) return null;
                  const atual = ponto[atualKey];
                  const anterior = ponto[anteriorKey];
                  return (
                    <div className="min-w-44 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: cor }} />
                          {rotulo(ponto.dataAtual, granularidade)}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {atual != null ? formatValor(atual) : "sem dados"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-sm" style={{ background: cor, opacity: 0.3 }} />
                          {rotulo(ponto.dataAnterior, granularidade)}
                        </span>
                        <span className="tabular-nums">
                          {anterior != null ? formatValor(anterior) : "sem dados"}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey={anteriorKey}
                name="Período anterior"
                fill={cor}
                fillOpacity={0.28}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              <Line
                dataKey={atualKey}
                name={nomeAtual}
                type="monotone"
                stroke={cor}
                strokeWidth={2}
                dot={{ r: 3, fill: cor, stroke: "var(--card)", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
