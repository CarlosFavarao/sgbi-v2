"use client";

import { InfoTooltip } from "@/components/ui/tooltip";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { propsEixoX, propsEixoY, propsGrade } from "@/components/charts/estilo";
import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
import { LegendaGrafico, type ItemLegenda } from "@/components/charts/legenda-grafico";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { formatInteiro, formatMoeda, formatPercentual } from "@/lib/format";
import { VENDAS_CONFIG } from "../config";
import type { ClasseAbc, CriterioAbc, CurvaAbc as Curva } from "../types";

const CRITERIOS: { value: CriterioAbc; label: string }[] = [
  { value: "faturamento", label: "Por Faturamento" },
  { value: "rentabilidade", label: "Por Rentabilidade" },
];

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const CLASSES: Record<ClasseAbc, { badge: string; texto: string; cor: string }> = {
  A: { badge: "bg-success", texto: "text-success", cor: "var(--success)" },
  B: { badge: "bg-warning", texto: "text-warning", cor: "var(--warning)" },
  C: { badge: "bg-error", texto: "text-error", cor: "var(--error)" },
};

const { A, B } = VENDAS_CONFIG.abc;

/** Faixas do eixo X (% dos produtos) de cada classe, em sequência A → B → C. */
function faixasPorClasse(curva: Curva | undefined) {
  if (!curva?.totalProdutos) return [];
  let inicio = 0;
  return curva.classes.map((c) => {
    const fim = inicio + (c.produtos / curva.totalProdutos) * 100;
    const faixa = { classe: c.classe, x1: inicio, x2: fim };
    inicio = fim;
    return faixa;
  });
}

function CurvaPlot({
  curva,
  base,
  detalhado,
}: {
  curva: Curva;
  /** "das vendas" ou "do lucro", para o texto da dica. */
  base: string;
  /** Gráfico da janela ampliada: eixos e marcações mais detalhados. */
  detalhado: boolean;
}) {
  // Fundo colorido de cada classe no gráfico.
  const faixasX = faixasPorClasse(curva);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={curva.curva} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid {...propsGrade(detalhado)} />
        {faixasX.map((f) => (
          <ReferenceArea
            key={f.classe}
            x1={f.x1}
            x2={f.x2}
            fill={CLASSES[f.classe].cor}
            fillOpacity={0.1}
            ifOverflow="hidden"
          />
        ))}
        <XAxis
          dataKey="produtos"
          type="number"
          domain={[0, 100]}
          ticks={detalhado ? [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] : [0, 20, 40, 60, 80, 100]}
          tickFormatter={(v: number) => `${v}%`}
          {...propsEixoX(detalhado)}
        />
        <YAxis
          domain={[0, 100]}
          ticks={detalhado ? [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] : [0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          {...propsEixoY(detalhado)}
          width={40}
        />
        <Tooltip
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as { produtos: number; acumulado: number } | undefined;
            if (!active || !p) return null;
            return (
              <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg">
                <span className="font-semibold tabular-nums">{formatPercentual(p.produtos)}</span> dos produtos ={" "}
                <span className="font-semibold tabular-nums">{formatPercentual(p.acumulado)}</span> {base}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="acumulado"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="var(--chart-1)"
          fillOpacity={0.12}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CurvaAbc({ abc, carregando }: { abc: Record<CriterioAbc, Curva> | undefined; carregando: boolean }) {
  const [criterio, setCriterio] = useState<CriterioAbc>("faturamento");
  const curva = abc?.[criterio];
  const base = criterio === "faturamento" ? "das vendas" : "do lucro";

  const titulo = `Curva ABC (${criterio === "faturamento" ? "Faturamento" : "Rentabilidade"})`;
  const legenda: ItemLegenda[] = (curva?.classes ?? []).map((c) => ({
    nome: `Classe ${c.classe}: ${formatInteiro(c.produtos)} produtos, ${formatPercentual(c.participacao)} ${base}`,
    cor: CLASSES[c.classe].cor,
  }));

  return (
    <Card className="h-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Classificação ABC de Produtos
          <InfoTooltip
            size={0.65}
            texto={`Produtos ordenados do maior para o menor ${criterio === "faturamento" ? "faturamento" : "lucro bruto"}: classe A até ${A}% acumulado, B até ${A + B}% e C o restante.`}
          />
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Segmented label="Critério da curva ABC" value={criterio} options={CRITERIOS} onChange={setCriterio} />
          {curva && curva.totalProdutos > 0 && (
            <ExpandirGrafico
              titulo={titulo}
              descricao={`% acumulado ${base} conforme cresce a fatia de produtos, do maior para o menor.`}
              legenda={<LegendaGrafico itens={legenda} grande />}
            >
              <CurvaPlot curva={curva} base={base} detalhado />
            </ExpandirGrafico>
          )}
        </div>
      </CardHeader>

      {/* Card largo e baixo: classes empilhadas à esquerda e a curva à direita. */}
      <div
        className="relative grid min-h-0 flex-1 grid-cols-[minmax(9.5rem,11rem)_1fr] gap-3 px-3 pb-3 pt-2"
        aria-busy={carregando}
      >
        <div className="flex flex-col justify-center gap-1.5">
          <div className="text-[11px] text-muted-foreground">
            % {base} · {criterio === "faturamento" ? "venda" : "lucro bruto"}
          </div>
          {(
            curva?.classes ??
            (["A", "B", "C"] as const).map((classe) => ({ classe, produtos: 0, participacao: 0, valor: 0 }))
          ).map((c) => (
            <div key={c.classe} className="min-w-0 rounded-xl border px-2 py-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${CLASSES[c.classe].badge}`}
                >
                  {c.classe}
                </span>
                <span className="truncate text-sm font-bold tabular-nums">
                  {formatInteiro(c.produtos)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">produtos</span>
                </span>
              </div>
              <div
                className="truncate text-[11px] tabular-nums"
                title={`${formatPercentual(c.participacao)} ${base} · ${formatMoeda(c.valor)}`}
              >
                <span className={`font-semibold ${CLASSES[c.classe].texto}`}>{formatPercentual(c.participacao)}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-semibold">{formatMoeda(c.valor)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          {/* As cores das faixas são as dos cards A/B/C ao lado (sem legenda repetida). */}
          <div className="text-xs font-semibold">{titulo}</div>
          <div className="min-h-0 flex-1" role="img" aria-label={`Curva ABC por ${criterio}`}>
            {curva && curva.totalProdutos > 0 ? (
              <CurvaPlot curva={curva} base={base} detalhado={false} />
            ) : (
              !carregando && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem dados no período
                </div>
              )
            )}
          </div>
        </div>
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
