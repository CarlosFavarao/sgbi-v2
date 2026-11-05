"use client";

import Icon from "@mdi/react";
import { mdiCalendarArrowRight, mdiDownload } from "@mdi/js";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { baixarCsv } from "@/lib/csv";
import { parseIso } from "@/lib/date";
import { formatDiaMes, formatMesAno, formatMoeda } from "@/lib/format";
import { fluxoPrevisto, type Granularidade, type LinhaPrevista } from "../compute";
import type { Movimento } from "../types";

const GRANULARIDADES: { value: Granularidade; label: string }[] = [
  { value: "dia", label: "Diário" },
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
];

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function rotulo(l: LinhaPrevista, g: Granularidade) {
  if (g === "mes") return formatMesAno(l.chave);
  if (g === "semana") return `${formatDiaMes(l.inicio)} – ${formatDiaMes(l.fim)}`;
  return `${SEMANA[parseIso(l.inicio).getUTCDay()]} ${formatDiaMes(l.inicio)}`;
}

const STATUS = {
  ok: { label: "Ok", classe: "text-success", ponto: "bg-success" },
  atencao: { label: "Atenção", classe: "text-warning", ponto: "bg-warning" },
  critico: { label: "Crítico", classe: "text-error", ponto: "bg-error" },
} as const;

const ORDEM_STATUS = { ok: 0, atencao: 1, critico: 2 } as const;

function colunasFluxo(granularidade: Granularidade): Coluna<LinhaPrevista>[] {
  return [
    { id: "data", titulo: "Data", align: "left", className: "font-medium", cell: (l) => rotulo(l, granularidade), ordenar: (l) => l.inicio },
    { id: "entradas", titulo: "Entradas previstas", cell: (l) => formatMoeda(l.entradas), ordenar: (l) => l.entradas },
    { id: "saidas", titulo: "Saídas previstas", cell: (l) => formatMoeda(l.saidas), ordenar: (l) => l.saidas },
    {
      id: "saldo",
      titulo: `Saldo do ${granularidade === "dia" ? "dia" : "período"}`,
      cell: (l) => <span className={l.saldo < 0 ? "text-error" : "text-success"}>{formatMoeda(l.saldo)}</span>,
      ordenar: (l) => l.saldo,
    },
    {
      id: "acumulado",
      titulo: "Acumulado",
      dica: "Acumulado a partir da referência, sem o saldo bancário de hoje",
      cell: (l) => <span className={l.acumulado < 0 ? "text-error" : ""}>{formatMoeda(l.acumulado)}</span>,
      ordenar: (l) => l.acumulado,
    },
    {
      id: "status",
      titulo: "Status",
      align: "left",
      cell: (l) => {
        const s = STATUS[l.status];
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.classe}`}>
            <span className={`size-2 rounded-full ${s.ponto}`} aria-hidden />
            {s.label}
          </span>
        );
      },
      ordenar: (l) => ORDEM_STATUS[l.status],
    },
  ];
}

/** Fluxo previsto dos próximos dias: só títulos em aberto e cartões a liquidar (P43). */
export function FluxoPrevistoTable({
  movimentos,
  referencia,
  dias,
  carregando,
}: {
  movimentos: Movimento[];
  referencia: string;
  dias: number;
  carregando: boolean;
}) {
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const linhas = fluxoPrevisto(movimentos, referencia, dias, granularidade);

  const exportar = () =>
    baixarCsv(
      `fluxo-previsto-${referencia}.csv`,
      [
        "Período",
        "Entradas previstas (R$)",
        "Saídas previstas (R$)",
        "Saldo do período (R$)",
        "Acumulado (R$)",
        "Status",
      ],
      linhas.map((l) => [rotulo(l, granularidade), l.entradas, l.saidas, l.saldo, l.acumulado, STATUS[l.status].label]),
    );

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiCalendarArrowRight} size={0.9} className="text-primary" aria-hidden />
          Fluxo de Caixa Previsto · Próximos {dias} dias
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Agrupamento" value={granularidade} options={GRANULARIDADES} onChange={setGranularidade} />
          <button
            type="button"
            onClick={exportar}
            disabled={!linhas.length}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon path={mdiDownload} size={0.75} aria-hidden />
            Exportar
          </button>
        </div>
      </CardHeader>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando}>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <DataTable colunas={colunasFluxo(granularidade)} linhas={linhas} chave={(l) => l.chave} />
        </div>
        <LoadingOverlay ativo={carregando} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
