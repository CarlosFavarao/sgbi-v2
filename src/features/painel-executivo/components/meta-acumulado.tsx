import Icon from "@mdi/react";
import { mdiCalendarMonthOutline, mdiChartBar } from "@mdi/js";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { percentual } from "../compute";
import { formatMesAno, formatMoeda, formatPercentual } from "../format";
import type { MetaResponse } from "../types";

export function MetaAcumulado({
  meta,
  carregando,
}: {
  meta: MetaResponse | undefined;
  carregando: boolean;
}) {
  const atingido = meta?.metaMes ? percentual(meta.realizadoMes, meta.metaMes) : null;
  const falta = meta ? Math.max(meta.metaMes - meta.realizadoMes, 0) : 0;
  const mediaNecessaria = meta && meta.diasRestantes > 0 ? falta / meta.diasRestantes : null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <CardTitle>Venda vs Meta (acumulado)</CardTitle>
          <CardDescription>
            {meta ? `Mês de ${formatMesAno(meta.mes)} até o fim do período` : "Mês do fim do período"}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {carregando && !meta ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : !meta || atingido == null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
            <span className="font-medium">Meta não cadastrada para {meta ? formatMesAno(meta.mes) : "o mês"}</span>
            <span className="text-sm text-muted-foreground">
              Realizado no mês: {formatMoeda(meta?.realizadoMes ?? 0)}
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatMoeda(meta.realizadoMes)}</div>
                <div className="text-sm font-semibold text-success">{formatPercentual(atingido)} da meta</div>
              </div>
              <dl className="flex gap-6 text-sm">
                <div>
                  <dt className="text-muted-foreground">Meta do mês</dt>
                  <dd className="font-semibold tabular-nums">{formatMoeda(meta.metaMes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Falta</dt>
                  <dd className="font-semibold tabular-nums">{formatMoeda(falta)}</dd>
                </div>
              </dl>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={Math.round(atingido)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Meta atingida"
            >
              <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(atingido, 100)}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Icon path={mdiChartBar} size={1.1} className="text-primary" aria-hidden />
                <div>
                  <div className="text-xs text-muted-foreground">Média diária necessária</div>
                  <div className="font-semibold tabular-nums">
                    {mediaNecessaria != null ? formatMoeda(mediaNecessaria) : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Icon path={mdiCalendarMonthOutline} size={1.1} className="text-primary" aria-hidden />
                <div>
                  <div className="text-xs text-muted-foreground">Dias restantes</div>
                  <div className="font-semibold tabular-nums">{meta.diasRestantes}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
