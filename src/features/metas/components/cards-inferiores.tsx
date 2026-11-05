"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMoeda, formatPercentual, formatPontos } from "@/lib/format";
import type { ResumoMeta } from "../compute";
import { METAS_CONFIG } from "../config";
import type { AbaPeriodo, PeriodoMeta } from "../types";
import type { LinhaAcompanhamento } from "./acompanhamento-table";
import { ORDEM_STATUS, StatusMetaBadge } from "./status";

function CardLista({
  titulo,
  acao,
  carregando,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  carregando: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="@container min-w-0">
      <CardHeader className="flex-nowrap!">
        <CardTitle className="min-w-0 truncate text-sm" title={titulo}>
          {titulo}
        </CardTitle>
        {acao}
      </CardHeader>
      <div className="relative px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="overflow-hidden rounded-lg border">{children}</div>
        <LoadingOverlay ativo={carregando} label={titulo} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;
}

type LinhaPeriodo = { periodo: PeriodoMeta; resumo: ResumoMeta };

function colunasPeriodos(onSelecionar: (aba: AbaPeriodo) => void): Coluna<LinhaPeriodo>[] {
  return [
    {
      id: "periodo",
      titulo: "Período",
      align: "left",
      cell: ({ periodo }) => (
        <button
          type="button"
          className="text-left font-medium focus-visible:outline-2 focus-visible:outline-ring"
          onClick={(e) => {
            e.stopPropagation();
            onSelecionar(periodo.id);
          }}
        >
          {periodo.label}
        </button>
      ),
    },
    { id: "meta", titulo: "Meta", cell: ({ resumo }) => formatMoeda(resumo.meta), ordenar: ({ resumo }) => resumo.meta },
    {
      id: "realizado",
      titulo: "Realizado",
      cell: ({ periodo, resumo }) => (periodo.decorrido ? formatMoeda(resumo.realizado) : "—"),
      ordenar: ({ periodo, resumo }) => (periodo.decorrido ? resumo.realizado : null),
    },
    {
      id: "atingimento",
      titulo: "Ating.",
      cell: ({ resumo }) => <span className="font-semibold">{formatPercentual(resumo.atingimento)}</span>,
      ordenar: ({ resumo }) => resumo.atingimento,
    },
    {
      id: "status",
      // Card estreito: só os pontos coloridos (o nome fica no título de cada um).
      titulo: <span className="sr-only @[26rem]:not-sr-only">Situação</span>,
      rotulo: "Situação",
      align: "left",
      cell: ({ resumo }) => <StatusMetaBadge status={resumo.status} compacto />,
      ordenar: ({ resumo }) => ORDEM_STATUS[resumo.status],
    },
  ];
}

/** Meta, realizado e atingimento de cada aba; clicar numa linha abre a aba. */
export function MetasPorPeriodo({
  linhas,
  ativa,
  onSelecionar,
  carregando,
}: {
  linhas: LinhaPeriodo[];
  ativa: AbaPeriodo;
  onSelecionar: (aba: AbaPeriodo) => void;
  carregando: boolean;
}) {
  return (
    <CardLista titulo="Metas por Período (total)" carregando={carregando}>
      <DataTable
        colunas={colunasPeriodos(onSelecionar)}
        linhas={linhas}
        chave={(l) => l.periodo.id}
        aoClicar={(l) => onSelecionar(l.periodo.id)}
        classeLinha={(l) => (l.periodo.id === ativa ? "bg-primary/10" : "")}
        cabecalhoFixo={false}
        densidade="mini"
      />
    </CardLista>
  );
}

const COLUNAS_RANKING: Coluna<LinhaAcompanhamento>[] = [
  {
    id: "departamento",
    titulo: "Departamento",
    align: "left",
    className: "w-full max-w-0 truncate",
    cell: (l) => <span title={l.descricao}>{l.descricao}</span>,
    ordenar: (l) => l.descricao,
  },
  {
    id: "atingimento",
    titulo: "Ating.",
    cell: (l) => <span className="font-semibold">{formatPercentual(l.resumo.atingimento)}</span>,
    ordenar: (l) => l.resumo.atingimento,
  },
  {
    id: "diferenca",
    titulo: "Diferença",
    cell: (l) => (
      <span className={(l.resumo.diferenca ?? 0) >= 0 ? "text-success" : "text-error"}>{formatMoeda(l.resumo.diferenca)}</span>
    ),
    ordenar: (l) => l.resumo.diferenca,
  },
  { id: "projecao", titulo: "Projeção", cell: (l) => formatMoeda(l.resumo.projecao), ordenar: (l) => l.resumo.projecao },
];

function TabelaRanking({ linhas }: { linhas: LinhaAcompanhamento[] }) {
  return <DataTable colunas={COLUNAS_RANKING} linhas={linhas} chave={(l) => String(l.codigo)} densidade="mini" vazio={null} />;
}

/** Realizado ÷ meta esperada até a referência (critério de risco e de melhor desempenho). */
export const ritmo = (r: ResumoMeta) => (r.metaEsperada ? r.realizado / r.metaEsperada : null);

/** Departamentos em risco ou com melhor desempenho, pelo ritmo (P37). */
export function RankingDepartamentos({
  titulo,
  descricao,
  linhas,
  carregando,
}: {
  titulo: string;
  descricao: string;
  linhas: LinhaAcompanhamento[];
  carregando: boolean;
}) {
  const n = METAS_CONFIG.linhasNoCard;
  return (
    <CardLista
      titulo={titulo}
      carregando={carregando}
      acao={
        <Dialog>
          <DialogTrigger
            disabled={linhas.length <= n}
            className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
          >
            Ver todos
            <Icon path={mdiArrowRight} size={0.55} aria-hidden />
          </DialogTrigger>
          <DialogContent titulo={titulo} descricao={descricao} className="max-w-2xl">
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              <div className="overflow-hidden rounded-lg border">
                <TabelaRanking linhas={linhas} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {linhas.length ? <TabelaRanking linhas={linhas.slice(0, n)} /> : <Vazio>Nenhum departamento.</Vazio>}
    </CardLista>
  );
}

const COLUNAS_MARGEM: Coluna<LinhaAcompanhamento>[] = [
  {
    id: "departamento",
    titulo: "Departamento",
    align: "left",
    className: "w-full max-w-0 truncate",
    cell: (l) => <span title={l.descricao}>{l.descricao}</span>,
    ordenar: (l) => l.descricao,
  },
  { id: "meta", titulo: "Meta", cell: (l) => formatPercentual(l.resumo.metaMargem), ordenar: (l) => l.resumo.metaMargem },
  { id: "atual", titulo: "Atual", cell: (l) => formatPercentual(l.resumo.margem), ordenar: (l) => l.resumo.margem },
  {
    id: "diferenca",
    titulo: "Dif.",
    cell: (l) => (
      <span
        className={`font-semibold ${
          l.resumo.statusMargem === "ok" ? "text-success" : l.resumo.statusMargem === "atencao" ? "text-warning" : "text-error"
        }`}
      >
        {formatPontos(l.resumo.diferencaMargem).replace(" p.p.", "")}
      </span>
    ),
    ordenar: (l) => l.resumo.diferencaMargem,
  },
];

/** Meta de margem × margem atual por departamento, pior diferença primeiro. */
export function SituacaoMargem({ linhas, carregando }: { linhas: LinhaAcompanhamento[]; carregando: boolean }) {
  const comMeta = linhas
    .filter((l) => l.resumo.metaMargem != null && l.resumo.margem != null)
    .sort((a, b) => a.resumo.diferencaMargem! - b.resumo.diferencaMargem!);
  return (
    <CardLista titulo="Situação da Margem Bruta" carregando={carregando}>
      {comMeta.length ? (
        <div className="max-h-[8.6rem] overflow-y-auto">
          <DataTable colunas={COLUNAS_MARGEM} linhas={comMeta} chave={(l) => String(l.codigo)} densidade="mini" />
        </div>
      ) : (
        <Vazio>Sem meta de margem por departamento.</Vazio>
      )}
    </CardLista>
  );
}
