"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatDiaMes, formatMesAno, formatMoeda, formatMoedaCompacta } from "@/lib/format";
import type { PontoEvolucaoCaixa } from "../compute";

const LEGENDA = [
  { nome: "Entradas", cor: "var(--success)", forma: "rounded-sm" },
  { nome: "Saídas", cor: "var(--error)", forma: "rounded-sm" },
  { nome: "Resultado acumulado (eixo direito)", cor: "var(--chart-1)", forma: "h-0.5 w-3.5 rounded-full" },
];

/**
 * Entradas (para cima) e saídas (para baixo) de cada dia do mês, com o
 * resultado acumulado: realizado até a referência e projetado depois (linha
 * tracejada). Barras claras = previstas. Sem saldo bancário, o acumulado parte de zero (P42).
 */
export function EvolucaoCaixaChart({
  mes,
  referencia,
  pontos,
  carregando,
}: {
  mes: string;
  referencia: string;
  pontos: PontoEvolucaoCaixa[];
  carregando: boolean;
}) {
  const dados = pontos.map((p) => ({
    ...p,
    saidasNeg: -p.saidas,
    saidasPrevistasNeg: -p.saidasPrevistas,
  }));
  const temDados = pontos.some((p) => p.entradas || p.saidas || p.entradasPrevistas || p.saidasPrevistas);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Evolução do Caixa · {formatMesAno(mes)}</CardTitle>
          <ul className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {LEGENDA.map((l) => (
              <li key={l.nome} className="flex items-center gap-1.5">
                <span
                  className={`${l.forma.startsWith("h-") ? l.forma : `size-2.5 ${l.forma}`}`}
                  style={{ background: l.cor }}
                />
                {l.nome}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success opacity-35" />
              Previsto
            </li>
          </ul>
        </div>
      </CardHeader>

      <div className="relative h-36 px-1 pb-2 pt-1" aria-busy={carregando}>
        {!temDados ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem movimento no mês
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} stackOffset="sign" margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="data"
                tickFormatter={(d: string) => d.slice(8, 10)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={8}
              />
              <YAxis
                tickFormatter={formatMoedaCompacta}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={84}
              />
              {/* O acumulado cresce muito mais que um dia: eixo próprio à direita. */}
              <YAxis
                yAxisId="acumulado"
                orientation="right"
                tickFormatter={formatMoedaCompacta}
                tick={{ fill: "var(--chart-1)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={76}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ReferenceLine
                x={referencia}
                stroke="var(--primary)"
                strokeDasharray="3 3"
                label={{ value: "Ref.", position: "insideTopLeft", fill: "var(--primary)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as PontoEvolucaoCaixa | undefined;
                  if (!active || !p) return null;
                  const linhas = [
                    ["Entradas", p.entradas, "text-success"],
                    ["Entradas previstas", p.entradasPrevistas, "text-success"],
                    ["Saídas", p.saidas, "text-error"],
                    ["Saídas previstas", p.saidasPrevistas, "text-error"],
                  ] as const;
                  return (
                    <div className="min-w-52 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                      <div className="mb-1 font-semibold">
                        {formatDiaMes(p.data)}
                        {p.data === referencia && " (referência)"}
                      </div>
                      {linhas
                        .filter(([, v]) => v)
                        .map(([nome, v, cor]) => (
                          <div key={nome} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{nome}</span>
                            <span className={`font-semibold tabular-nums ${cor}`}>{formatMoeda(v)}</span>
                          </div>
                        ))}
                      <div className="mt-1 flex justify-between gap-4 border-t pt-1">
                        <span className="text-muted-foreground">Resultado acumulado</span>
                        <span className="font-semibold tabular-nums">{formatMoeda(p.acumulado ?? p.projetado)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="entradas" stackId="e" fill="var(--success)" maxBarSize={14} isAnimationActive={false} />
              <Bar
                dataKey="entradasPrevistas"
                stackId="e"
                fill="var(--success)"
                fillOpacity={0.35}
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Bar dataKey="saidasNeg" stackId="e" fill="var(--error)" maxBarSize={14} isAnimationActive={false} />
              <Bar
                dataKey="saidasPrevistasNeg"
                stackId="e"
                fill="var(--error)"
                fillOpacity={0.35}
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Line
                yAxisId="acumulado"
                dataKey="acumulado"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="acumulado"
                dataKey="projetado"
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
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
