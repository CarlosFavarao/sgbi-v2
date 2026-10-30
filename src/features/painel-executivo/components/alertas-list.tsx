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
import { useState } from "react";
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

const VISIVEIS = 5;

export function AlertasList({ alertas, carregando }: { alertas: Alerta[]; carregando: boolean }) {
  const [todos, setTodos] = useState(false);
  const lista = todos ? alertas : alertas.slice(0, VISIVEIS);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiBellOutline} size={0.9} className="text-error" aria-hidden />
          Alertas e Pontos de Atenção
        </CardTitle>
        {alertas.length > VISIVEIS && (
          <button
            type="button"
            onClick={() => setTodos((t) => !t)}
            className="rounded-lg border px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary"
          >
            {todos ? "Ver menos" : `Ver todos (${alertas.length})`}
          </button>
        )}
      </CardHeader>

      <div className="flex flex-col gap-2 p-4">
        {carregando ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
        ) : !lista.length ? (
          <div className="flex items-center gap-3 rounded-xl border p-3 text-sm text-muted-foreground">
            <Icon path={mdiCheckCircleOutline} size={1} className="text-success" aria-hidden />
            Nenhum ponto de atenção pelas regras atuais.
          </div>
        ) : (
          lista.map((alerta) => {
            const icone = ICONES[alerta.tipo];
            return (
              <div key={alerta.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${icone.className}`}>
                  <Icon path={icone.path} size={0.85} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{alerta.titulo}</div>
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
