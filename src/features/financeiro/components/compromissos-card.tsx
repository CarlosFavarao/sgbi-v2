"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { formatData, formatMoeda } from "@/lib/format";
import { FINANCEIRO_CONFIG } from "../config";
import type { Compromisso } from "../types";

type Filtro = "todos" | "saida" | "entrada";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "saida", label: "Pagamentos" },
  { value: "entrada", label: "Recebimentos" },
];

const th = "px-2 py-1 font-medium";
const td = "px-2 py-[3px]";

function Tabela({ compromissos }: { compromissos: Compromisso[] }) {
  return (
    <table className="w-full border-collapse whitespace-nowrap text-xs">
      <thead className="sticky top-0 bg-secondary text-[11px] text-muted-foreground">
        <tr>
          <th className={`${th} text-left`}>Vencimento</th>
          <th className={`${th} w-full text-left`}>Descrição</th>
          <th className={`${th} text-left`}>Tipo</th>
          <th className={`${th} text-right`}>Valor</th>
          <th className={`${th} text-left`}>Status</th>
        </tr>
      </thead>
      <tbody>
        {compromissos.map((c, i) => (
          <tr key={`${c.data}-${c.descricao}-${i}`} className="border-t hover:bg-secondary/50">
            <td className={`${td} tabular-nums`}>{formatData(c.data)}</td>
            <td className={`${td} max-w-0 truncate`} title={c.descricao}>
              {c.descricao}
            </td>
            <td className={`${td} ${c.tipo === "entrada" ? "text-success" : "text-error"}`}>
              {c.tipo === "entrada" ? "Recebimento" : "Pagamento"}
            </td>
            <td className={`${td} text-right tabular-nums`}>{formatMoeda(c.valor)}</td>
            <td className={td}>
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${c.situacao === "vencido" ? "text-error" : "text-warning"}`}
              >
                <span
                  className={`size-2 rounded-full ${c.situacao === "vencido" ? "bg-error" : "bg-warning"}`}
                  aria-hidden
                />
                {c.situacao === "vencido" ? "Vencido" : "A vencer"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Títulos a vencer nos próximos dias e vencidos em aberto (cartões agrupados por dia e empresa). */
export function CompromissosCard({ compromissos, carregando }: { compromissos: Compromisso[]; carregando: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const lista = compromissos.filter((c) => filtro === "todos" || c.tipo === filtro);
  // No card: primeiro os vencidos, depois os próximos vencimentos.
  const destaque = [...lista.filter((c) => c.situacao === "vencido"), ...lista.filter((c) => c.situacao !== "vencido")];
  const n = FINANCEIRO_CONFIG.compromissosNoCard;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>Compromissos a Vencer</CardTitle>
        <div className="flex items-center gap-2">
          <Segmented label="Tipo de compromisso" value={filtro} options={FILTROS} onChange={setFiltro} />
          <Dialog>
            <DialogTrigger
              disabled={lista.length <= n}
              className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
            >
              Ver todos
              <Icon path={mdiArrowRight} size={0.55} aria-hidden />
            </DialogTrigger>
            <DialogContent
              titulo="Compromissos a vencer"
              descricao="Títulos em aberto (vencidos e a vencer) e cartões a liquidar, por data."
              className="max-w-3xl"
            >
              <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
                <div className="overflow-hidden rounded-lg border">
                  <Tabela compromissos={lista} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando}>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          {destaque.length ? (
            <Tabela compromissos={destaque.slice(0, Math.max(n, 30))} />
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhum compromisso.</p>
          )}
        </div>
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
