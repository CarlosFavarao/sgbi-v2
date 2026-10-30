"use client";

import Icon from "@mdi/react";
import {
  mdiAlertOutline,
  mdiArrowDownBold,
  mdiArrowUpBold,
  mdiBellOutline,
  mdiCartRemove,
  mdiCheckCircleOutline,
  mdiPercentOutline,
  mdiTagOutline,
} from "@mdi/js";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Alerta } from "../compute";

const ICONES: Record<Alerta["tipo"], { path: string; className: string }> = {
  "compra-alta": { path: mdiArrowUpBold, className: "bg-negative-highlight text-error" },
  // Comprar bem menos do que vende também pede atenção (ruptura de estoque).
  "compra-baixa": { path: mdiArrowDownBold, className: "bg-summary-orange-bg text-warning" },
  margem: { path: mdiPercentOutline, className: "bg-negative-highlight text-error" },
  despesa: { path: mdiAlertOutline, className: "bg-summary-orange-bg text-warning" },
  cancelamento: { path: mdiCartRemove, className: "bg-negative-highlight text-error" },
  desconto: { path: mdiTagOutline, className: "bg-summary-orange-bg text-warning" },
};

export function AlertasList({ alertas, carregando }: { alertas: Alerta[]; carregando: boolean }) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiBellOutline} size={0.9} className="text-error" aria-hidden />
          Alertas e Pontos de Atenção
        </CardTitle>
        {!carregando && alertas.length > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
            {alertas.length}
          </span>
        )}
      </CardHeader>

      {/* Rolagem própria: o card tem a altura definida pelo painel. */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3 pt-2">
        {carregando ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)
        ) : !alertas.length ? (
          <div className="flex items-center gap-2 rounded-xl border p-2 text-sm text-muted-foreground">
            <Icon path={mdiCheckCircleOutline} size={1} className="text-success" aria-hidden />
            Nenhum ponto de atenção pelas regras atuais.
          </div>
        ) : (
          alertas.map((alerta) => {
            const icone = ICONES[alerta.tipo];
            return (
              <div key={alerta.id} className="flex shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${icone.className}`}>
                  <Icon path={icone.path} size={0.7} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-snug">{alerta.titulo}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{alerta.detalhe}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
