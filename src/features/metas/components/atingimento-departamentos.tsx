"use client";

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
  const comMeta = linhas.filter((l) => l.resumo.atingimento != null).slice(0, 7);
  // Escala até o maior entre 100%, o esperado e o maior atingimento (com folga).
  const maximo = Math.max(100, esperado ?? 0, ...comMeta.map((l) => l.resumo.atingimento!)) * 1.05;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {esperado != null && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-px border-l border-dashed border-foreground/60" aria-hidden />
            Esperado: {formatPercentual(esperado)}
          </span>
        )}
      </CardHeader>

      <div className="relative h-32 px-4 pb-2 pt-1.5" aria-busy={carregando}>
        {!comMeta.length ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Sem meta por departamento no período
            </div>
          )
        ) : (
          <ul className="flex h-full flex-col justify-between">
            {comMeta.map((l) => {
              const at = l.resumo.atingimento!;
              return (
                <li
                  key={l.codigo}
                  className="grid grid-cols-[minmax(5.5rem,8rem)_1fr_3.75rem] items-center gap-2 text-xs"
                  title={`${l.descricao}: ${formatMoeda(l.resumo.realizado)} de ${formatMoeda(l.resumo.meta)}`}
                >
                  <span className="truncate font-medium">{l.descricao}</span>
                  <span className="relative h-3 rounded-sm bg-secondary">
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
                </li>
              );
            })}
          </ul>
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
