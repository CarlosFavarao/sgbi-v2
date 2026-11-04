"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
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
  "var(--chart-7)",
];
const COR_OUTRAS = "var(--muted-foreground)";

/** Até 8 fatias com cores próprias; o resto vira "Outras" (sem cor repetida). */
function agrupar(fatias: Fatia[]): (Fatia & { cor: string })[] {
  const visiveis = fatias.filter((f) => f.valor > 0);
  const lista =
    visiveis.length > CORES.length
      ? [
          ...visiveis.slice(0, CORES.length - 1),
          { nome: "Outras", valor: visiveis.slice(CORES.length - 1).reduce((t, f) => t + f.valor, 0) },
        ]
      : visiveis;
  return lista.map((f, i) => ({ ...f, cor: f.nome === "Outras" && i === CORES.length - 1 ? COR_OUTRAS : CORES[i] }));
}

/**
 * Rosca com a legenda ao lado. Sem tooltip flutuante (ficava por cima do centro):
 * ao passar o mouse numa fatia ou na legenda, o centro mostra o % e o valor dela.
 */
function Rosca({ titulo, fatias }: { titulo: string; fatias: Fatia[] }) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const total = fatias.reduce((t, f) => t + f.valor, 0);
  const lista = agrupar(fatias);
  const destaque = ativa != null ? lista[ativa] : null;
  const pct = (v: number) => formatPercentual(total ? (v / total) * 100 : null);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="text-xs font-semibold">{titulo}</div>
      {!lista.length ? (
        <p className="py-6 text-xs text-muted-foreground">Sem valores.</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[6.5rem_1fr] items-center gap-2">
          <div className="relative h-26 w-26" role="img" aria-label={`${titulo}: ${formatMoeda(total)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lista}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={1}
                  isAnimationActive={false}
                  onMouseEnter={(_, i) => setAtiva(i)}
                  onMouseLeave={() => setAtiva(null)}
                >
                  {lista.map((f, i) => (
                    <Cell
                      key={f.nome}
                      fill={f.cor}
                      stroke="var(--card)"
                      fillOpacity={ativa == null || ativa === i ? 1 : 0.35}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight tabular-nums">
              {destaque ? (
                <>
                  <span className="text-[11px] font-bold">{pct(destaque.valor)}</span>
                  <span className="text-[10px] text-muted-foreground">{formatMoedaCompacta(destaque.valor)}</span>
                </>
              ) : (
                <span className="text-[11px] font-bold">{formatMoedaCompacta(total)}</span>
              )}
            </span>
          </div>
          <ul className="flex min-w-0 flex-col gap-0.5 text-[11px]">
            {lista.map((f, i) => (
              <li
                key={f.nome}
                className={`flex min-w-0 items-center gap-1.5 rounded px-1 ${ativa === i ? "bg-secondary font-semibold" : ""}`}
                title={`${f.nome}: ${formatMoeda(f.valor)} (${pct(f.valor)})`}
                onMouseEnter={() => setAtiva(i)}
                onMouseLeave={() => setAtiva(null)}
              >
                <span className="size-2 shrink-0 rounded-sm" style={{ background: f.cor }} />
                <span className="truncate">{f.nome}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{pct(f.valor)}</span>
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
