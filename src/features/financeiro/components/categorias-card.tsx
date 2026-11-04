"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { formatMoeda, formatPercentual } from "@/lib/format";
import type { Categoria } from "../compute";

type Medida = "valor" | "participacao";
const MEDIDAS: { value: Medida; label: string }[] = [
  { value: "valor", label: "Valor (R$)" },
  { value: "participacao", label: "Participação (%)" },
];

function Lista({
  titulo,
  total,
  categorias,
  cor,
  medida,
}: {
  titulo: string;
  total: number;
  categorias: Categoria[];
  cor: string;
  medida: Medida;
}) {
  const maior = Math.max(...categorias.map((c) => c.valor), 1);
  return (
    <div className="min-w-0">
      <div className="mb-1 truncate text-xs font-semibold" style={{ color: cor }}>
        {titulo} · {formatMoeda(total)}
      </div>
      {!categorias.length ? (
        <p className="py-4 text-xs text-muted-foreground">Sem movimento realizado.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {categorias.map((c) => (
            <li
              key={c.categoria}
              className="grid grid-cols-[minmax(0,1fr)_3rem_auto] items-center gap-1.5 text-[11px]"
              title={`${c.categoria}: ${formatMoeda(c.valor)} (${formatPercentual(c.participacao)})`}
            >
              <span className="truncate">{c.categoria}</span>
              <span className="h-2 rounded-sm bg-secondary">
                <span
                  className="block h-full rounded-sm"
                  style={{ width: `${(c.valor / maior) * 100}%`, background: cor }}
                />
              </span>
              <span className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                {medida === "valor" ? formatMoeda(c.valor) : formatPercentual(c.participacao)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Entradas e saídas realizadas no mês por categoria (empresa de cartão, clientes, fornecedores, despesas). */
export function CategoriasCard({
  entradas,
  saidas,
  carregando,
}: {
  entradas: { total: number; categorias: Categoria[] };
  saidas: { total: number; categorias: Categoria[] };
  carregando: boolean;
}) {
  const [medida, setMedida] = useState<Medida>("valor");
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Entradas e Saídas por Categoria</CardTitle>
        <Segmented label="Medida" value={medida} options={MEDIDAS} onChange={setMedida} />
      </CardHeader>
      <div className="relative grid h-36 grid-cols-2 gap-3 overflow-hidden px-4 pb-2 pt-1.5" aria-busy={carregando}>
        <Lista titulo="Entradas" {...entradas} cor="var(--success)" medida={medida} />
        <Lista titulo="Saídas" {...saidas} cor="var(--error)" medida={medida} />
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
