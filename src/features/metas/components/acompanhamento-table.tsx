"use client";

import Icon from "@mdi/react";
import { mdiChevronRight, mdiDownload, mdiMagnify, mdiTarget } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useDeferredValue, useState } from "react";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { variacao } from "@/lib/calc";
import { baixarCsv } from "@/lib/csv";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { resumirMeta, type ResumoMeta } from "../compute";
import { metasQueries } from "../queries";
import type { FiltrosMetas, LinhaMetaNivel, Nivel, PeriodoMeta } from "../types";
import { DO_PERIODO } from "./kpis-metas";
import { ROTULO_STATUS, StatusMargemBadge, StatusMetaBadge } from "./status";

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
const th = "px-2.5 py-1.5 font-medium";
const td = "px-2.5 py-1 text-right tabular-nums";

/** Moeda colorida pelo sinal (diferença para a meta). */
function Sinal({ value, children }: { value: number | null; children: React.ReactNode }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className={value >= 0 ? "text-success" : "text-error"}>{children}</span>;
}

function Celulas({ l }: { l: LinhaAcompanhamento }) {
  const r = l.resumo;
  return (
    <>
      <td className={`${td} border-l`}>{r.meta != null ? formatMoeda(r.meta) : <span className="text-muted-foreground">—</span>}</td>
      <td className={`${td} border-l`}>{formatMoeda(r.realizado)}</td>
      <td className={td}>
        <Delta value={l.variacaoVenda} unidade="%" maiorMelhor />
      </td>
      <td className={`${td} border-l font-semibold`}>{formatPercentual(r.atingimento)}</td>
      <td className="px-2.5 py-1 text-left">
        <StatusMetaBadge status={r.status} />
      </td>
      <td className={`${td} border-l`}>
        <Sinal value={r.diferenca}>{formatMoeda(r.diferenca)}</Sinal>
      </td>
      <td className={td}>
        <Sinal value={r.diferenca}>{formatPercentual(r.meta && r.diferenca != null ? (r.diferenca / r.meta) * 100 : null)}</Sinal>
      </td>
      <td className={`${td} border-l`}>{formatMoeda(r.projecao)}</td>
      <td className={td}>
        {r.projecaoSobreMeta == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Sinal value={r.projecaoSobreMeta - 100}>{formatPercentual(r.projecaoSobreMeta)}</Sinal>
        )}
      </td>
      <td className={`${td} border-l`}>{formatPercentual(r.metaMargem)}</td>
      <td className={`${td} border-l`}>{formatPercentual(r.margem)}</td>
      <td className="border-l px-2.5 py-1 text-left">
        <StatusMargemBadge status={r.statusMargem} />
      </td>
    </>
  );
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

  function linhas(profundidade: number, lista: LinhaAcompanhamento[]): React.ReactNode {
    const nivelLinha = niveis[profundidade];
    const temFilhos = profundidade < niveis.length - 1;
    return lista.map((l) => {
      const chave = `${nivelLinha}:${l.codigo}`;
      const aberto = abertos.has(chave);
      const filhos = aberto ? linhasPorNivel[profundidade + 1].filter((f) => f.pai === l.codigo) : [];
      const filhosCarregando = aberto && carregando(consultas[profundidade + 1]);
      return (
        <Fragment key={chave}>
          <tr className={`border-t hover:bg-secondary/50 ${profundidade ? "bg-secondary/25" : ""}`}>
            <td className="py-1 pr-2.5 font-medium" style={{ paddingLeft: `${0.5 + profundidade * 1.1}rem` }}>
              <span className="flex items-center gap-1">
                {temFilhos ? (
                  <button
                    type="button"
                    onClick={() => alternar(chave)}
                    aria-expanded={aberto}
                    aria-label={`${aberto ? "Recolher" : "Expandir"} ${l.descricao}`}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Icon path={mdiChevronRight} size={0.7} className={`transition-transform ${aberto ? "rotate-90" : ""}`} />
                  </button>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <span className={profundidade ? "font-normal" : ""}>{l.descricao}</span>
              </span>
            </td>
            <Celulas l={l} />
          </tr>
          {filhosCarregando && (
            <tr className="border-t">
              <td colSpan={13} className="py-1.5 text-muted-foreground" style={{ paddingLeft: `${2 + profundidade * 1.1}rem` }}>
                <span className="inline-flex items-center gap-2 text-xs">
                  <Spinner className="size-3.5" /> Carregando…
                </span>
              </td>
            </tr>
          )}
          {!filhosCarregando && aberto && !filhos.length && (
            <tr className="border-t">
              <td colSpan={13} className="py-1.5 text-xs text-muted-foreground" style={{ paddingLeft: `${2 + profundidade * 1.1}rem` }}>
                Sem meta nem venda no nível de baixo.
              </td>
            </tr>
          )}
          {!filhosCarregando && linhas(profundidade + 1, filhos)}
        </Fragment>
      );
    });
  }

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
            {/* Sem quebra de linha: a tabela cresce até o conteúdo e o container rola na horizontal. */}
            <table className="w-full border-collapse whitespace-nowrap text-[13px]">
              <thead className="sticky top-0 z-10 bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th rowSpan={2} className={`${th} text-left`}>
                    {rotuloNivel}
                  </th>
                  <th className={`${th} border-l`}>Meta {DO_PERIODO[aba.id]}</th>
                  <th colSpan={2} className={`${th} border-l`}>Realizado</th>
                  <th colSpan={2} className={`${th} border-l`}>Atingimento</th>
                  <th colSpan={2} className={`${th} border-l`}>Diferença</th>
                  <th colSpan={2} className={`${th} border-l`}>Projeção de Fechamento</th>
                  <th className={`${th} border-l`}>Meta de Margem</th>
                  <th className={`${th} border-l`}>Margem Atual</th>
                  <th rowSpan={2} className={`${th} border-l`}>Situação Margem</th>
                </tr>
                <tr>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} text-right`}>Var. %</th>
                  <th className={`${th} border-l text-right`}>%</th>
                  <th className={`${th} text-left`}>Situação</th>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} text-right`}>%</th>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} text-right`}>% meta</th>
                  <th className={`${th} border-l text-right`}>%</th>
                  <th className={`${th} border-l text-right`}>%</th>
                </tr>
              </thead>
              <tbody>
                {linhas(0, raiz)}
                {!raiz.length && (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-muted-foreground">
                      Nenhum resultado.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card font-semibold">
                <tr className="border-t-2">
                  <td className="px-2.5 py-1.5">Total</td>
                  <Celulas l={total} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
        <LoadingOverlay ativo={carregando(base)} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
