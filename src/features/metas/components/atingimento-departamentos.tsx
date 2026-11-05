"use client";

import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMoeda, formatPercentual } from "@/lib/format";
import type { ResumoMeta } from "../compute";
import type { StatusMeta } from "../types";

export type LinhaAtingimento = { codigo: number; descricao: string; resumo: ResumoMeta };

const COR: Record<StatusMeta, string> = {
  acima: "var(--success)",
  "no-ritmo": "var(--info)",
  abaixo: "var(--warning)",
  aguardando: "var(--muted-foreground)",
  "sem-meta": "var(--muted-foreground)",
};

function ListaAtingimento({
  linhas,
  esperado,
  detalhado = false,
}: {
  linhas: LinhaAtingimento[];
  esperado: number | null;
  /** Janela ampliada: todos os departamentos, em linhas maiores. */
  detalhado?: boolean;
}) {
  // Escala até o maior entre 100%, o esperado e o maior atingimento (com folga).
  const maximo = Math.max(100, esperado ?? 0, ...linhas.map((l) => l.resumo.atingimento!)) * 1.05;
  return (
    <ul className={detalhado ? "flex flex-col gap-2" : "flex h-full flex-col justify-between"}>
      {linhas.map((l) => {
        const at = l.resumo.atingimento!;
        return (
          <li
            key={l.codigo}
            className={`grid items-center gap-2 ${
              detalhado ? "grid-cols-[minmax(8rem,16rem)_1fr_4.5rem] text-sm" : "grid-cols-[minmax(5.5rem,8rem)_1fr_3.75rem] text-xs"
            }`}
            title={`${l.descricao}: ${formatMoeda(l.resumo.realizado)} de ${formatMoeda(l.resumo.meta)}`}
          >
            <span className="truncate font-medium">{l.descricao}</span>
            <span className={`relative ${detalhado ? "h-4" : "h-3"} rounded-sm bg-secondary`}>
              <span
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ width: `${(Math.min(at, maximo) / maximo) * 100}%`, background: COR[l.resumo.status] }}
              />
              {esperado != null && (
                <span
                  aria-hidden
                  className="absolute -inset-y-1 border-l border-dashed border-foreground/60"
                  style={{ left: `${(esperado / maximo) * 100}%` }}
                />
              )}
            </span>
            <span className="text-right font-semibold tabular-nums">{formatPercentual(at)}</span>
            {detalhado && (
              <span className="col-span-full -mt-1 pl-1 text-xs tabular-nums text-muted-foreground">
                {formatMoeda(l.resumo.realizado)} de {formatMoeda(l.resumo.meta)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Atingimento (realizado ÷ meta do período) por departamento. A linha vertical
 * marca o esperado até a referência (100% em períodos encerrados); a cor diz se
 * o departamento está acima, no ritmo ou abaixo do esperado.
 */
export function AtingimentoDepartamentos({
  titulo,
  linhas,
  esperado,
  carregando,
}: {
  titulo: string;
  linhas: LinhaAtingimento[];
  /** % da meta esperado até a referência (marcador). */
  esperado: number | null;
  carregando: boolean;
}) {
  const todas = linhas.filter((l) => l.resumo.atingimento != null);
  const comMeta = todas.slice(0, 7);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <div className="flex items-center gap-2">
          {esperado != null && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-3 w-px border-l border-dashed border-foreground/60" aria-hidden />
              Esperado: {formatPercentual(esperado)}
            </span>
          )}
          <ExpandirGrafico
            titulo={titulo}
            descricao="Realizado ÷ meta do período de todos os departamentos; a linha tracejada marca o esperado até a referência."
            desabilitado={!todas.length}
            rolavel
          >
            <ListaAtingimento linhas={todas} esperado={esperado} detalhado />
          </ExpandirGrafico>
        </div>
      </CardHeader>

      <div className="relative h-32 px-4 pb-2 pt-1.5" aria-busy={carregando}>
        {!comMeta.length ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Sem meta por departamento no período
            </div>
          )
        ) : (
          <ListaAtingimento linhas={comMeta} esperado={esperado} />
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
