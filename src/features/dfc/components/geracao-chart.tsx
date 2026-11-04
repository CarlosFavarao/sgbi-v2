"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMesAno, formatMoeda, formatMoedaCompacta } from "@/lib/format";
import type { PontoGeracao } from "../compute";

/** Entradas, saídas e geração líquida dos 12 meses até o mês (a DRE é mensal: sem visão diária, P54). */
export function GeracaoChart({ pontos, carregando }: { pontos: PontoGeracao[]; carregando: boolean }) {
  const temDados = pontos.some((p) => p.entradas || p.saidas);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Evolução da Geração de Caixa · 12 meses</CardTitle>
          <ul className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success" />
              Entradas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-error" />
              Saídas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full bg-chart-1" />
              Geração líquida (eixo direito)
            </li>
          </ul>
        </div>
      </CardHeader>
      <div className="relative h-36 px-1 pb-2 pt-1" aria-busy={carregando}>
        {!temDados ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem DRE no período
            </div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pontos} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="mes"
                tickFormatter={(m: string) => formatMesAno(m).replace("/20", "/")}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tickFormatter={formatMoedaCompacta}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={76}
              />
              {/* A geração é bem menor que entradas e saídas: eixo próprio à direita. */}
              <YAxis
                yAxisId="geracao"
                orientation="right"
                tickFormatter={formatMoedaCompacta}
                tick={{ fill: "var(--chart-1)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as PontoGeracao | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="min-w-48 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                      <div className="mb-1 font-semibold">{formatMesAno(p.mes)}</div>
                      {(
                        [
                          ["Entradas", p.entradas, "text-success"],
                          ["Saídas", p.saidas, "text-error"],
                          ["Geração líquida", p.geracao, p.geracao >= 0 ? "text-success" : "text-error"],
                        ] as const
                      ).map(([nome, v, cor]) => (
                        <div key={nome} className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{nome}</span>
                          <span className={`font-semibold tabular-nums ${cor}`}>{formatMoeda(v)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="entradas"
                fill="var(--success)"
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Bar
                dataKey="saidas"
                fill="var(--error)"
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Line
                yAxisId="geracao"
                dataKey="geracao"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
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
