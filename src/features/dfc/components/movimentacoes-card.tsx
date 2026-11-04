"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatData, formatMoeda } from "@/lib/format";
import { DFC_CONFIG } from "../config";
import type { Movimentacao } from "../types";

const th = "px-2 py-1 font-medium";
const td = "px-2 py-[3px]";

function Tabela({ lista }: { lista: Movimentacao[] }) {
  return (
    <table className="w-full border-collapse whitespace-nowrap text-xs">
      <thead className="sticky top-0 bg-secondary text-[11px] text-muted-foreground">
        <tr>
          <th className={`${th} text-left`}>Data</th>
          <th className={`${th} w-full text-left`}>Descrição</th>
          <th className={`${th} text-right`}>Valor</th>
          <th className={`${th} text-left`}>Tipo</th>
          <th className={`${th} text-left`}>Origem</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((m, i) => (
          <tr key={`${m.data}-${m.descricao}-${i}`} className="border-t hover:bg-secondary/50">
            <td className={`${td} tabular-nums`}>{formatData(m.data)}</td>
            <td className={`${td} max-w-0 truncate`} title={m.descricao}>
              {m.descricao}
            </td>
            <td className={`${td} text-right tabular-nums ${m.tipo === "saida" ? "text-error" : ""}`}>
              {formatMoeda(m.tipo === "saida" ? -m.valor : m.valor)}
            </td>
            <td className={td}>{m.tipo === "entrada" ? "Entrada" : "Saída"}</td>
            <td className={`${td} text-muted-foreground`}>
              {m.origem}
              {m.situacao === "em-aberto" && " · em aberto"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Maiores movimentações do mês (cartões, contas a receber e a pagar); sem conta financeira (P42). */
export function MovimentacoesCard({ lista, carregando }: { lista: Movimentacao[]; carregando: boolean }) {
  const n = DFC_CONFIG.movimentacoesNoCard;
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-nowrap!">
        <CardTitle className="min-w-0 truncate">Movimentações Relevantes do Período</CardTitle>
        <Dialog>
          <DialogTrigger
            disabled={lista.length <= n}
            className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
          >
            Ver todas
            <Icon path={mdiArrowRight} size={0.55} aria-hidden />
          </DialogTrigger>
          <DialogContent
            titulo="Movimentações relevantes do período"
            descricao={`As ${DFC_CONFIG.movimentacoes} maiores do mês: cartões (por dia e empresa), contas a receber e a pagar.`}
            className="max-w-3xl"
          >
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              <div className="overflow-hidden rounded-lg border">
                <Tabela lista={lista} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <div className="relative px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="overflow-hidden rounded-lg border">
          {lista.length ? (
            <Tabela lista={lista.slice(0, n)} />
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Sem movimentações no mês.</p>
          )}
        </div>
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
