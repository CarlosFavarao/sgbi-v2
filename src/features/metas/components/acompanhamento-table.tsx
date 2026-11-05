"use client";

import { SituacaoPontos } from "@/components/situacao-pontos";
import Icon from "@mdi/react";
import { mdiDownload, mdiMagnify, mdiTarget } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { variacao } from "@/lib/calc";
import { baixarCsv } from "@/lib/csv";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { resumirMeta, type ResumoMeta } from "../compute";
import { metasQueries } from "../queries";
import type { FiltrosMetas, LinhaMetaNivel, Nivel, PeriodoMeta } from "../types";
import { DO_PERIODO } from "./kpis-metas";
import { ORDEM_MARGEM, ORDEM_STATUS, PONTOS_MARGEM, ROTULO_STATUS, StatusMargemBadge, StatusMetaBadge } from "./status";

const ORDEM: Nivel[] = ["departamento", "grupo", "subgrupo"];

const NIVEIS: { value: Nivel; label: string }[] = [
  { value: "departamento", label: "Departamento" },
  { value: "grupo", label: "Grupo" },
  { value: "subgrupo", label: "Subgrupo" },
];

export type LinhaAcompanhamento = {
  codigo: number;
  descricao: string;
  pai: number | null;
  resumo: ResumoMeta;
  variacaoVenda: number | null;
};

/** Linha da tabela a partir da meta e do realizado do nível. */
export function calcularLinha(l: LinhaMetaNivel, aba: PeriodoMeta): LinhaAcompanhamento {
  return {
    codigo: l.codigo,
    descricao: l.descricao,
    pai: l.pai,
    resumo: resumirMeta({
      meta: l.meta != null ? { meta: l.meta, metaLucro: l.metaLucro ?? 0 } : null,
      metaEsperada: l.metaEsperada,
      venda: l.venda,
      custo: l.custo,
      periodo: aba.periodo,
      decorrido: aba.decorrido,
    }),
    variacaoVenda: aba.decorrido ? variacao(l.venda, l.vendaAnterior) : null,
  };
}

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean }) => q.isPending || q.isPlaceholderData;
const SEM_VALOR = <span className="text-muted-foreground">—</span>;

/** Moeda colorida pelo sinal (diferença para a meta). */
function Sinal({ value, children }: { value: number | null; children: React.ReactNode }) {
  if (value == null) return SEM_VALOR;
  return <span className={value >= 0 ? "text-success" : "text-error"}>{children}</span>;
}

const pctDiferenca = (r: ResumoMeta) => (r.meta && r.diferenca != null ? (r.diferenca / r.meta) * 100 : null);

function colunasAcompanhamento(rotuloNivel: string, metaDoPeriodo: string): Coluna<LinhaAcompanhamento>[] {
  return [
    { id: "nome", titulo: rotuloNivel, subtitulo: "Nome", align: "left", cell: (l) => l.descricao, ordenar: (l) => l.descricao },
    {
      id: "meta",
      titulo: `Meta ${metaDoPeriodo}`,
      subtitulo: "Valor",
      divisor: true,
      cell: (l) => (l.resumo.meta != null ? formatMoeda(l.resumo.meta) : SEM_VALOR),
      ordenar: (l) => l.resumo.meta,
    },
    { id: "realizado", titulo: "Realizado", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.resumo.realizado), ordenar: (l) => l.resumo.realizado },
    {
      id: "var-realizado",
      titulo: "Realizado",
      subtitulo: "Var. %",
      cell: (l) => <Delta value={l.variacaoVenda} unidade="%" maiorMelhor />,
      ordenar: (l) => l.variacaoVenda,
    },
    {
      id: "atingimento",
      titulo: "Atingimento",
      subtitulo: "%",
      divisor: true,
      cell: (l) => <span className="font-semibold">{formatPercentual(l.resumo.atingimento)}</span>,
      ordenar: (l) => l.resumo.atingimento,
    },
    {
      id: "status",
      titulo: "Atingimento",
      subtitulo: "Situação",
      align: "left",
      cell: (l) => <StatusMetaBadge status={l.resumo.status} />,
      ordenar: (l) => ORDEM_STATUS[l.resumo.status],
    },
    {
      id: "diferenca",
      titulo: "Diferença",
      subtitulo: "Valor",
      divisor: true,
      cell: (l) => <Sinal value={l.resumo.diferenca}>{formatMoeda(l.resumo.diferenca)}</Sinal>,
      ordenar: (l) => l.resumo.diferenca,
    },
    {
      id: "diferenca-pct",
      titulo: "Diferença",
      subtitulo: "%",
      cell: (l) => <Sinal value={l.resumo.diferenca}>{formatPercentual(pctDiferenca(l.resumo))}</Sinal>,
      ordenar: (l) => pctDiferenca(l.resumo),
    },
    { id: "projecao", titulo: "Projeção de Fechamento", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.resumo.projecao), ordenar: (l) => l.resumo.projecao },
    {
      id: "projecao-meta",
      titulo: "Projeção de Fechamento",
      subtitulo: "% meta",
      cell: (l) =>
        l.resumo.projecaoSobreMeta == null ? (
          SEM_VALOR
        ) : (
          <Sinal value={l.resumo.projecaoSobreMeta - 100}>{formatPercentual(l.resumo.projecaoSobreMeta)}</Sinal>
        ),
      ordenar: (l) => l.resumo.projecaoSobreMeta,
    },
    { id: "meta-margem", titulo: "Meta de Margem", subtitulo: "%", divisor: true, cell: (l) => formatPercentual(l.resumo.metaMargem), ordenar: (l) => l.resumo.metaMargem },
    { id: "margem", titulo: "Margem Atual", subtitulo: "%", divisor: true, cell: (l) => formatPercentual(l.resumo.margem), ordenar: (l) => l.resumo.margem },
    {
      id: "status-margem",
      titulo: "Situação Margem",
      subtitulo: <SituacaoPontos itens={PONTOS_MARGEM} />,
      rotulo: "Situação da margem",
      align: "left",
      divisor: true,
      cell: (l) => <StatusMargemBadge status={l.resumo.statusMargem} />,
      ordenar: (l) => ORDEM_MARGEM[l.resumo.statusMargem],
    },
  ];
}

/**
 * Meta, realizado, atingimento, diferença, projeção e margem por nível
 * mercadológico, na aba de período escolhida. Cada linha expande no nível de baixo.
 */
export function AcompanhamentoTable({
  filtros,
  aba,
  total,
}: {
  filtros: FiltrosMetas;
  aba: PeriodoMeta;
  /** Total da loja (ou do departamento filtrado), da mesma fonte dos KPIs. */
  total: LinhaAcompanhamento;
}) {
  const [nivel, setNivel] = useState<Nivel>("departamento");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);

  // Níveis a partir da aba escolhida; os de baixo só carregam ao expandir uma linha.
  const niveis = ORDEM.slice(ORDEM.indexOf(nivel));
  const abertosNoNivel = (n: Nivel) => [...abertos].some((chave) => chave.startsWith(`${n}:`));
  const habilitado = (i: number) => i === 0 || (!!niveis[i] && abertosNoNivel(niveis[i - 1]));
  const opcoes = (i: number) => {
    const q = metasQueries.niveis(filtros, niveis[i] ?? nivel, aba);
    return { ...q, enabled: q.enabled !== false && habilitado(i) };
  };
  // Número fixo de hooks: uma consulta por nível possível.
  const consultas = [useQuery(opcoes(0)), useQuery(opcoes(1)), useQuery(opcoes(2))];
  const base = consultas[0];

  const linhasPorNivel = niveis.map((_, i) => (consultas[i].data?.linhas ?? []).map((l) => calcularLinha(l, aba)));
  const termo = buscaAdiada.trim().toLocaleLowerCase("pt-BR");
  const raiz = linhasPorNivel[0].filter((l) => !termo || l.descricao.toLocaleLowerCase("pt-BR").includes(termo));

  const alternar = (chave: string) =>
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });

  const rotuloNivel = NIVEIS.find((n) => n.value === nivel)!.label;

  const exportar = () => {
    const csv: (string | number | null)[][] = [];
    const adicionar = (profundidade: number, lista: LinhaAcompanhamento[]) => {
      for (const l of lista) {
        const r = l.resumo;
        csv.push([
          NIVEIS.find((n) => n.value === niveis[profundidade])!.label,
          l.descricao,
          r.meta,
          r.realizado,
          l.variacaoVenda,
          r.atingimento,
          ROTULO_STATUS[r.status],
          r.diferenca,
          r.projecao,
          r.projecaoSobreMeta,
          r.metaMargem,
          r.margem,
        ]);
        if (abertos.has(`${niveis[profundidade]}:${l.codigo}`) && linhasPorNivel[profundidade + 1]) {
          adicionar(profundidade + 1, linhasPorNivel[profundidade + 1].filter((f) => f.pai === l.codigo));
        }
      }
    };
    adicionar(0, raiz);
    adicionar(0, [total]);
    baixarCsv(
      `metas-${aba.id}-${nivel}-${aba.periodo.inicio}-a-${aba.periodo.fim}.csv`,
      ["Nível", "Descrição", "Meta (R$)", "Realizado (R$)", "Var. realizado (%)", "Atingimento (%)", "Situação",
        "Diferença (R$)", "Projeção (R$)", "Projeção / meta (%)", "Meta de margem (%)", "Margem atual (%)"],
      csv,
    );
  };

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiTarget} size={0.9} className="text-primary" aria-hidden />
          Acompanhamento das Metas por {rotuloNivel} · {aba.label}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Nível"
            value={nivel}
            options={NIVEIS}
            onChange={(n) => {
              setNivel(n);
              setAbertos(new Set());
            }}
          />
          <label className="relative">
            <span className="sr-only">Buscar {rotuloNivel.toLowerCase()}</span>
            <Icon
              path={mdiMagnify}
              size={0.75}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={`Buscar ${rotuloNivel.toLowerCase()}…`}
              className="h-9 w-48 rounded-lg border bg-card pl-8 pr-3 text-sm shadow-xs outline-none focus-visible:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={exportar}
            disabled={!base.data}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon path={mdiDownload} size={0.75} aria-hidden />
            Exportar
          </button>
        </div>
      </CardHeader>

      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando(base)}>
        {base.isPending ? (
          <div className="min-h-0 flex-1 rounded-xl border" />
        ) : base.isError ? (
          <p className="py-10 text-center text-sm text-error">{base.error.message}</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
            <DataTable
              colunas={colunasAcompanhamento(rotuloNivel, DO_PERIODO[aba.id])}
              linhas={raiz}
              chave={(l, p) => `${niveis[p]}:${l.codigo}`}
              total={total}
              rotuloTotal="Total"
              arvore={{
                abertas: abertos,
                alternar,
                expansivel: (p) => p < niveis.length - 1,
                filhos: (l, p) => ({
                  linhas: linhasPorNivel[p + 1].filter((f) => f.pai === l.codigo),
                  carregando: carregando(consultas[p + 1]),
                }),
                rotuloVazio: "Sem meta nem venda no nível de baixo.",
                descricao: (l) => l.descricao,
              }}
            />
          </div>
        )}
        {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
        <LoadingOverlay ativo={carregando(base)} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
