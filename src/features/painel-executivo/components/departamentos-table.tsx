"use client";

import { SituacaoPontos } from "@/components/situacao-pontos";
import Icon from "@mdi/react";
import { mdiAlertCircle, mdiCheckCircle, mdiCloseCircle, mdiCubeOutline, mdiMagnify } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { Segmented } from "@/components/ui/segmented";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { calcularLinha, type LinhaCalculada, type Situacao } from "../compute";
import { formatMoeda, formatPercentual, formatPontos } from "@/lib/format";
import { painelQueries } from "../queries";
import type { Filtros, Nivel } from "../types";
import { Delta } from "@/components/kpi/kpi-card";

const NIVEIS: { value: Nivel; label: string }[] = [
  { value: "departamento", label: "Departamento" },
  { value: "grupo", label: "Grupo" },
  { value: "subgrupo", label: "Subgrupo" },
];

const SITUACOES: Record<Situacao, { label: string; icon: string; className: string }> = {
  bom: { label: "Bom", icon: mdiCheckCircle, className: "bg-positive-highlight text-success" },
  atencao: { label: "Atenção", icon: mdiAlertCircle, className: "bg-summary-orange-bg text-warning" },
  critico: { label: "Crítico", icon: mdiCloseCircle, className: "bg-negative-highlight text-error" },
};

const PONTOS_SITUACAO = (Object.keys(SITUACOES) as Situacao[]).map((k) => ({
  label: SITUACOES[k].label,
  classe: { bom: "bg-success", atencao: "bg-warning", critico: "bg-error" }[k],
}));

function SituacaoBadge({ situacao }: { situacao: Situacao | null }) {
  if (!situacao) return <span className="text-muted-foreground">—</span>;
  const s = SITUACOES[situacao];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 align-middle text-xs font-medium ${s.className}`}>
      <Icon path={s.icon} size={0.6} aria-hidden />
      {s.label}
    </span>
  );
}

/** Variação em p.p. da compra sobre venda: subir é ruim. */
function PontosCompra({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cor = Math.abs(value) < 0.005 ? "text-muted-foreground" : value > 0 ? "text-error" : "text-success";
  return <span className={`tabular-nums ${cor}`}>{formatPontos(value).replace(" p.p.", "")}</span>;
}

function totalizar(linhas: LinhaCalculada[]): LinhaCalculada {
  const soma = linhas.reduce(
    (t, l) => ({
      compra: t.compra + l.compra,
      venda: t.venda + l.venda,
      compraAnterior: t.compraAnterior + l.compraAnterior,
      vendaAnterior: t.vendaAnterior + l.vendaAnterior,
    }),
    { compra: 0, venda: 0, compraAnterior: 0, vendaAnterior: 0 },
  );
  return calcularLinha({ codigo: 0, descricao: "Total", ...soma });
}

const ORDEM_SITUACAO = { bom: 0, atencao: 1, critico: 2 } as const;

function colunasDepartamentos(rotuloNivel: string): Coluna<LinhaCalculada>[] {
  return [
    { id: "nome", titulo: rotuloNivel, subtitulo: "Nome", align: "left", className: "font-medium", cell: (l) => l.descricao, ordenar: (l) => l.descricao },
    { id: "compra", titulo: "Compras", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.compra), ordenar: (l) => l.compra },
    {
      id: "var-compra",
      titulo: "Compras",
      subtitulo: "Var. %",
      cell: (l) => <Delta value={l.variacaoCompra} unidade="%" maiorMelhor={false} />,
      ordenar: (l) => l.variacaoCompra,
    },
    { id: "venda", titulo: "Venda", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.venda), ordenar: (l) => l.venda },
    {
      id: "var-venda",
      titulo: "Venda",
      subtitulo: "Var. %",
      cell: (l) => <Delta value={l.variacaoVenda} unidade="%" maiorMelhor />,
      ordenar: (l) => l.variacaoVenda,
    },
    { id: "csv", titulo: "Compra sobre Venda", subtitulo: "%", divisor: true, cell: (l) => formatPercentual(l.compraSobreVenda), ordenar: (l) => l.compraSobreVenda },
    {
      id: "var-csv",
      titulo: "Compra sobre Venda",
      subtitulo: "Var. p.p.",
      cell: (l) => <PontosCompra value={l.variacaoPp} />,
      ordenar: (l) => l.variacaoPp,
    },
    {
      id: "situacao",
      titulo: "Situação",
      subtitulo: <SituacaoPontos itens={PONTOS_SITUACAO} />,
      rotulo: "Situação",
      align: "center",
      divisor: true,
      cell: (l) => <SituacaoBadge situacao={l.situacao} />,
      ordenar: (l) => (l.situacao ? ORDEM_SITUACAO[l.situacao] : null),
    },
  ];
}

export function DepartamentosTable({ filtros }: { filtros: Filtros }) {
  const [nivel, setNivel] = useState<Nivel>("departamento");
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const { data, isPending, isError, error, isPlaceholderData } = useQuery(
    painelQueries.departamentos(filtros, nivel),
  );

  // Primeiro carregamento ou troca de nível/filtro (dados anteriores cobertos).
  const carregando = isPending || isPlaceholderData;
  const linhas = useMemo(() => (data?.linhas ?? []).map(calcularLinha), [data]);
  const filtradas = useMemo(() => {
    const termo = buscaAdiada.trim().toLocaleLowerCase("pt-BR");
    return termo ? linhas.filter((l) => l.descricao.toLocaleLowerCase("pt-BR").includes(termo)) : linhas;
  }, [linhas, buscaAdiada]);
  const total = useMemo(() => totalizar(linhas), [linhas]);
  const rotuloNivel = NIVEIS.find((n) => n.value === nivel)!.label;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiCubeOutline} size={0.9} className="text-primary" aria-hidden />
          Compra sobre Venda por {rotuloNivel}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Nível" value={nivel} options={NIVEIS} onChange={setNivel} />
          <label className="relative [[data-estreito]_&]:hidden">
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
              className="h-9 w-52 rounded-lg border bg-card pl-8 pr-3 text-sm shadow-xs outline-none focus-visible:border-primary"
            />
          </label>
        </div>
      </CardHeader>

      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando}>
        {isPending ? (
          <div className="min-h-0 flex-1 rounded-xl border" />
        ) : isError ? (
          <p className="py-10 text-center text-sm text-error">{error.message}</p>
        ) : (
          <div
            className="min-h-0 flex-1 overflow-auto rounded-xl border"
          >
            <DataTable
              colunas={colunasDepartamentos(rotuloNivel)}
              linhas={filtradas}
              chave={(l) => String(l.codigo)}
              total={total}
              rotuloTotal="Total"
            />
          </div>
        )}
        {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
        <LoadingOverlay ativo={carregando} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
