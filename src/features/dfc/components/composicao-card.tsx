"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMoeda, formatMoedaCompacta, formatPercentual } from "@/lib/format";

export type Fatia = { nome: string; valor: number };

const CORES = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-8)",
  "var(--chart-6)",
];

function Rosca({ titulo, fatias }: { titulo: string; fatias: Fatia[] }) {
  const total = fatias.reduce((t, f) => t + f.valor, 0);
  const visiveis = fatias.filter((f) => f.valor > 0);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="text-xs font-semibold">{titulo}</div>
      {!visiveis.length ? (
        <p className="py-6 text-xs text-muted-foreground">Sem valores.</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[6.5rem_1fr] items-center gap-2">
          <div className="relative h-26 w-26" role="img" aria-label={`${titulo}: ${formatMoeda(total)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visiveis}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {visiveis.map((f, i) => (
                    <Cell key={f.nome} fill={CORES[i % CORES.length]} stroke="var(--card)" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    const f = payload?.[0]?.payload as Fatia | undefined;
                    if (!active || !f) return null;
                    return (
                      <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
                        {f.nome}: <span className="font-semibold tabular-nums">{formatMoeda(f.valor)}</span>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">
              {formatMoedaCompacta(total)}
            </span>
          </div>
          <ul className="flex min-w-0 flex-col gap-0.5 text-[11px]">
            {visiveis.map((f, i) => (
              <li
                key={f.nome}
                className="flex min-w-0 items-center gap-1.5"
                title={`${f.nome}: ${formatMoeda(f.valor)}`}
              >
                <span className="size-2 shrink-0 rounded-sm" style={{ background: CORES[i % CORES.length] }} />
                <span className="truncate">{f.nome}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                  {formatPercentual(total ? (f.valor / total) * 100 : null)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Composição das entradas e das saídas do mês (as duas roscas lado a lado). */
export function ComposicaoCard({
  entradas,
  saidas,
  carregando,
}: {
  entradas: Fatia[];
  saidas: Fatia[];
  carregando: boolean;
}) {
  return (
    <Card className="min-h-0 min-w-0 flex-1">
      <CardHeader>
        <CardTitle>Composição das Entradas e Saídas</CardTitle>
      </CardHeader>
      <div
        className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-3 pt-1.5 sm:grid-cols-2"
        aria-busy={carregando}
      >
        <Rosca titulo="Entradas" fatias={entradas} />
        <Rosca titulo="Saídas" fatias={saidas} />
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
