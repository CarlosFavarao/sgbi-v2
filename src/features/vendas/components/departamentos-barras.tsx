"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Select } from "@/components/ui/select";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { VENDAS_CONFIG } from "../config";
import type { LinhaVendaNivel } from "../types";

type Medida = "venda" | "lucro";

const MEDIDAS: { value: Medida; label: string }[] = [
  { value: "venda", label: "Venda (R$)" },
  { value: "lucro", label: "Lucro bruto (R$)" },
];

const valorDe = (l: LinhaVendaNivel, medida: Medida) => (medida === "venda" ? l.venda : l.venda - l.custo);

/**
 * Lista com barras horizontais (ranking): nome, barra proporcional ao maior,
 * valor e participação no total. Os departamentos depois dos N primeiros
 * viram "Outros".
 */
export function DepartamentosBarras({
  linhas,
  carregando,
}: {
  linhas: LinhaVendaNivel[] | undefined;
  carregando: boolean;
}) {
  const [medida, setMedida] = useState<Medida>("venda");
  const ordenadas = [...(linhas ?? [])]
    .map((l) => ({ codigo: l.codigo, descricao: l.descricao, valor: valorDe(l, medida) }))
    .filter((l) => l.valor !== 0)
    .sort((a, b) => b.valor - a.valor);

  const n = VENDAS_CONFIG.departamentosNoGrafico;
  const itens =
    ordenadas.length > n + 1
      ? [
          ...ordenadas.slice(0, n),
          { codigo: -1, descricao: "Outros", valor: ordenadas.slice(n).reduce((t, l) => t + l.valor, 0) },
        ]
      : ordenadas;
  const total = ordenadas.reduce((t, l) => t + l.valor, 0);
  const maior = Math.max(...itens.map((i) => Math.abs(i.valor)), 1);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Vendas por Departamento</CardTitle>
        <Select
          aria-label="Medida do gráfico de departamentos"
          className="w-40"
          value={medida}
          options={MEDIDAS}
          onValueChange={setMedida}
        />
      </CardHeader>

      <div className="relative h-36 px-4 pb-2 pt-1.5" aria-busy={carregando}>
        {!itens.length ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados no período
            </div>
          )
        ) : (
          <ul className="flex h-full flex-col justify-between">
            {itens.map((item, i) => (
              <li
                key={item.codigo}
                className="grid grid-cols-[minmax(5.5rem,8rem)_1fr_auto_3.75rem] items-center gap-2 text-xs"
              >
                <span className="truncate font-medium" title={item.descricao}>
                  {item.descricao}
                </span>
                <span className="h-3 overflow-hidden rounded-sm bg-secondary">
                  <span
                    className="block h-full rounded-sm"
                    style={{
                      width: `${(Math.max(item.valor, 0) / maior) * 100}%`,
                      background: "var(--chart-1)",
                      // Os primeiros mais fortes, como no BI antigo.
                      opacity: item.codigo === -1 ? 0.35 : 1 - i * 0.07,
                    }}
                  />
                </span>
                <span className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                  {formatMoeda(item.valor)}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {formatPercentual(total ? (item.valor / total) * 100 : null)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
