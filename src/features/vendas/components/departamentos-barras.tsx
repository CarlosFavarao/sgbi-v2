"use client";

import { useState } from "react";
import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
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

type ItemBarra = { codigo: number; descricao: string; valor: number };

function ListaDepartamentos({
  itens,
  total,
  detalhado = false,
}: {
  itens: ItemBarra[];
  total: number;
  /** Janela ampliada: todos os departamentos, em linhas maiores. */
  detalhado?: boolean;
}) {
  const maior = Math.max(...itens.map((i) => Math.abs(i.valor)), 1);
  return (
    <ul className={detalhado ? "flex flex-col gap-2" : "flex h-full flex-col justify-between"}>
      {itens.map((item, i) => (
        <li
          key={item.codigo}
          className={`grid items-center gap-2 ${
            detalhado
              ? "grid-cols-[minmax(8rem,16rem)_1fr_9rem_4.5rem] text-sm"
              : "grid-cols-[minmax(5.5rem,8rem)_1fr_6.75rem_3.75rem] text-xs"
          }`}
        >
          <span className="truncate font-medium" title={item.descricao}>
            {item.descricao}
          </span>
          <span className={`${detalhado ? "h-4" : "h-3"} overflow-hidden rounded-sm bg-secondary`}>
            <span
              className="block h-full rounded-sm"
              style={{
                width: `${(Math.max(item.valor, 0) / maior) * 100}%`,
                background: "var(--chart-1)",
                // Os primeiros mais fortes, como no BI antigo.
                opacity: item.codigo === -1 ? 0.35 : Math.max(1 - i * 0.07, detalhado ? 0.4 : 0),
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
  );
}

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

  const seletor = (
    <Select
      aria-label="Medida do gráfico de departamentos"
      className="w-40"
      value={medida}
      options={MEDIDAS}
      onValueChange={setMedida}
    />
  );

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Vendas por Departamento</CardTitle>
        {seletor}
      </CardHeader>

      <ExpandirGrafico
        className="relative min-h-0 flex-1 px-4 pb-2 pt-1.5"
        ocupado={carregando}
        titulo="Vendas por Departamento"
        descricao={`${MEDIDAS.find((m) => m.value === medida)!.label} de todos os departamentos, com a participação no total.`}
        filtros={seletor}
        desabilitado={!ordenadas.length || carregando}
        rolavel
        detalhe={<ListaDepartamentos itens={ordenadas} total={total} detalhado />}
      >
        {!itens.length ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados no período
            </div>
          )
        ) : (
          <ListaDepartamentos itens={itens} total={total} />
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </ExpandirGrafico>
    </Card>
  );
}
