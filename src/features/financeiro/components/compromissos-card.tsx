"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
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

const COLUNAS: Coluna<Compromisso>[] = [
  { id: "vencimento", titulo: "Vencimento", align: "left", className: "tabular-nums", cell: (c) => formatData(c.data), ordenar: (c) => c.data },
  {
    id: "descricao",
    titulo: "Descrição",
    align: "left",
    className: "w-full max-w-0 truncate",
    cell: (c) => <span title={c.descricao}>{c.descricao}</span>,
    ordenar: (c) => c.descricao,
  },
  {
    id: "tipo",
    titulo: "Tipo",
    align: "left",
    cell: (c) => (
      <span className={c.tipo === "entrada" ? "text-success" : "text-error"}>
        {c.tipo === "entrada" ? "Recebimento" : "Pagamento"}
      </span>
    ),
    ordenar: (c) => c.tipo,
  },
  { id: "valor", titulo: "Valor", cell: (c) => formatMoeda(c.valor), ordenar: (c) => c.valor },
  {
    id: "status",
    titulo: "Status",
    align: "left",
    cell: (c) => (
      <span
        className={`inline-flex items-center gap-1.5 font-medium ${c.situacao === "vencido" ? "text-error" : "text-warning"}`}
      >
        <span className={`size-2 rounded-full ${c.situacao === "vencido" ? "bg-error" : "bg-warning"}`} aria-hidden />
        {c.situacao === "vencido" ? "Vencido" : "A vencer"}
      </span>
    ),
    ordenar: (c) => c.situacao,
  },
];

function Tabela({ compromissos }: { compromissos: Compromisso[] }) {
  return (
    <DataTable
      colunas={COLUNAS}
      linhas={compromissos}
      chave={(c) => `${c.data}-${c.tipo}-${c.situacao}-${c.descricao}-${c.valor}`}
      densidade="compacto"
    />
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
