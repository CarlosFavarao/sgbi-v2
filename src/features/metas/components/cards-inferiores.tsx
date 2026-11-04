"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMoeda, formatPercentual, formatPontos } from "@/lib/format";
import type { ResumoMeta } from "../compute";
import { METAS_CONFIG } from "../config";
import type { AbaPeriodo, PeriodoMeta } from "../types";
import type { LinhaAcompanhamento } from "./acompanhamento-table";
import { StatusMetaBadge } from "./status";

const th = "px-2 py-0.5 font-medium";
const td = "px-2 py-0.5";

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

/** Meta, realizado e atingimento de cada aba; clicar numa linha abre a aba. */
export function MetasPorPeriodo({
  linhas,
  ativa,
  onSelecionar,
  carregando,
}: {
  linhas: { periodo: PeriodoMeta; resumo: ResumoMeta }[];
  ativa: AbaPeriodo;
  onSelecionar: (aba: AbaPeriodo) => void;
  carregando: boolean;
}) {
  return (
    <CardLista titulo="Metas por Período (total)" carregando={carregando}>
      <table className="w-full border-collapse whitespace-nowrap text-xs">
        <thead className="bg-secondary text-[11px] text-muted-foreground">
          <tr>
            <th className={`${th} text-left`}>Período</th>
            <th className={`${th} text-right`}>Meta</th>
            <th className={`${th} text-right`}>Realizado</th>
            <th className={`${th} text-right`}>Ating.</th>
            <th className={`${th} text-left`}>
              {/* Card estreito: só os pontos coloridos (o nome fica no título de cada um). */}
              <span className="sr-only @[26rem]:not-sr-only">Situação</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ periodo, resumo }) => (
            <tr
              key={periodo.id}
              onClick={() => onSelecionar(periodo.id)}
              className={`cursor-pointer border-t hover:bg-secondary/50 ${periodo.id === ativa ? "bg-primary/10" : ""}`}
            >
              <td className={td}>
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
              </td>
              <td className={`${td} text-right tabular-nums`}>{formatMoeda(resumo.meta)}</td>
              <td className={`${td} text-right tabular-nums`}>{periodo.decorrido ? formatMoeda(resumo.realizado) : "—"}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatPercentual(resumo.atingimento)}</td>
              <td className={td}>
                <StatusMetaBadge status={resumo.status} compacto />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardLista>
  );
}

function TabelaRanking({ linhas }: { linhas: LinhaAcompanhamento[] }) {
  return (
    <table className="w-full border-collapse whitespace-nowrap text-xs">
      <thead className="sticky top-0 bg-secondary text-[11px] text-muted-foreground">
        <tr>
          <th className={`${th} w-full text-left`}>Departamento</th>
          <th className={`${th} text-right`}>Ating.</th>
          <th className={`${th} text-right`}>Diferença</th>
          <th className={`${th} text-right`}>Projeção</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.codigo} className="border-t hover:bg-secondary/50">
            <td className={`${td} max-w-0 truncate`} title={l.descricao}>
              {l.descricao}
            </td>
            <td className={`${td} text-right font-semibold tabular-nums`}>{formatPercentual(l.resumo.atingimento)}</td>
            <td className={`${td} text-right tabular-nums ${(l.resumo.diferenca ?? 0) >= 0 ? "text-success" : "text-error"}`}>
              {formatMoeda(l.resumo.diferenca)}
            </td>
            <td className={`${td} text-right tabular-nums`}>{formatMoeda(l.resumo.projecao)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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

/** Meta de margem × margem atual por departamento, pior diferença primeiro. */
export function SituacaoMargem({ linhas, carregando }: { linhas: LinhaAcompanhamento[]; carregando: boolean }) {
  const comMeta = linhas
    .filter((l) => l.resumo.metaMargem != null && l.resumo.margem != null)
    .sort((a, b) => a.resumo.diferencaMargem! - b.resumo.diferencaMargem!);
  return (
    <CardLista titulo="Situação da Margem Bruta" carregando={carregando}>
      {comMeta.length ? (
        <div className="max-h-[8.6rem] overflow-y-auto">
          <table className="w-full border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-secondary text-[11px] text-muted-foreground">
              <tr>
                <th className={`${th} w-full text-left`}>Departamento</th>
                <th className={`${th} text-right`}>Meta</th>
                <th className={`${th} text-right`}>Atual</th>
                <th className={`${th} text-right`}>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {comMeta.map((l) => (
                <tr key={l.codigo} className="border-t hover:bg-secondary/50">
                  <td className={`${td} max-w-0 truncate`} title={l.descricao}>
                    {l.descricao}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{formatPercentual(l.resumo.metaMargem)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatPercentual(l.resumo.margem)}</td>
                  <td
                    className={`${td} text-right font-semibold tabular-nums ${
                      l.resumo.statusMargem === "ok" ? "text-success" : l.resumo.statusMargem === "atencao" ? "text-warning" : "text-error"
                    }`}
                  >
                    {formatPontos(l.resumo.diferencaMargem).replace(" p.p.", "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio>Sem meta de margem por departamento.</Vazio>
      )}
    </CardLista>
  );
}
