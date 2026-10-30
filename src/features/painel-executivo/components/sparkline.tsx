"use client";

import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatDiaMes } from "../format";

type Ponto = { data: string; valor: number | null };

/** Minigráfico diário do card de KPI, com tooltip por dia. */
export function Sparkline({
  data,
  kind,
  color,
  format,
  label,
}: {
  data: Ponto[];
  kind: "bar" | "area";
  color: string;
  format: (value: number) => string;
  label: string;
}) {
  if (!data.some((p) => p.valor != null)) return null;

  const tooltip = (
    <Tooltip
      cursor={kind === "bar" ? { fill: "var(--muted)", opacity: 0.4 } : { stroke: "var(--border)" }}
      allowEscapeViewBox={{ x: true, y: true }}
      wrapperStyle={{ zIndex: 20 }}
      content={({ active, payload }) => {
        const ponto = payload?.[0]?.payload as Ponto | undefined;
        if (!active || !ponto || ponto.valor == null) return null;
        return (
          <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
            <span className="text-muted-foreground">{formatDiaMes(ponto.data)} · </span>
            <span className="font-semibold tabular-nums">{format(ponto.valor)}</span>
          </div>
        );
      }}
    />
  );

  return (
    <div className="h-11 w-24 shrink-0" role="img" aria-label={`${label}: evolução diária`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
            {tooltip}
            <Bar dataKey="valor" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
            {tooltip}
            <Area
              type="linear"
              dataKey="valor"
              stroke={color}
              strokeWidth={1.5}
              fill={color}
              fillOpacity={0.15}
              connectNulls
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
