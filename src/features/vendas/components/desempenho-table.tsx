"use client";

import Icon from "@mdi/react";
import { mdiDownload, mdiMagnify, mdiStoreOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { baixarCsv } from "@/lib/csv";
import { formatDecimal, formatInteiro, formatMoeda, formatPercentual } from "@/lib/format";
import { calcularDesempenho, type LinhaDesempenho } from "../compute";
import { vendasQueries } from "../queries";
import type { Filtros, LinhaCuponsNivel, Nivel } from "../types";

const ORDEM: Nivel[] = ["departamento", "grupo", "subgrupo"];

const NIVEIS: { value: Nivel; label: string }[] = [
  { value: "departamento", label: "Departamento" },
  { value: "grupo", label: "Grupo" },
  { value: "subgrupo", label: "Subgrupo" },
];

export type TotaisCupons = Pick<LinhaCuponsNivel, "cupons" | "itens" | "cuponsAnterior" | "itensAnterior">;

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean }) => q.isPending || q.isPlaceholderData;

/** Célula de cupons: spinner enquanto a consulta lenta (logpdv) não chega. */
function Pendente({ children, valor }: { children: React.ReactNode; valor: unknown }) {
  if (valor === undefined) {
    return (
      <span className="inline-flex text-muted-foreground" title="Carregando cupons (PDV)…">
        <Spinner className="size-3.5" />
      </span>
    );
  }
  if (valor === null) return <span className="text-muted-foreground">—</span>;
  return children;
}

const delta = (v: number | null | undefined, unidade: "%" | "pp") => <Delta value={v ?? null} unidade={unidade} maiorMelhor />;

function colunasDesempenho(rotuloNivel: string): Coluna<LinhaDesempenho>[] {
  return [
    { id: "nome", titulo: rotuloNivel, subtitulo: "Nome", align: "left", cell: (l) => l.descricao, ordenar: (l) => l.descricao },
    { id: "venda", titulo: "Venda", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.venda), ordenar: (l) => l.venda },
    { id: "var-venda", titulo: "Venda", subtitulo: "Var. %", cell: (l) => delta(l.variacaoVenda, "%"), ordenar: (l) => l.variacaoVenda },
    { id: "margem", titulo: "Margem Bruta", subtitulo: "%", divisor: true, cell: (l) => formatPercentual(l.margem), ordenar: (l) => l.margem },
    { id: "var-margem", titulo: "Margem Bruta", subtitulo: "Var. p.p.", cell: (l) => delta(l.variacaoMargemPp, "pp"), ordenar: (l) => l.variacaoMargemPp },
    { id: "lucro", titulo: "Lucro Bruto", subtitulo: "Valor", divisor: true, cell: (l) => formatMoeda(l.lucro), ordenar: (l) => l.lucro },
    { id: "var-lucro", titulo: "Lucro Bruto", subtitulo: "Var. %", cell: (l) => delta(l.variacaoLucro, "%"), ordenar: (l) => l.variacaoLucro },
    {
      id: "cupons",
      titulo: "Cupons (PDV)",
      subtitulo: "Qtd",
      divisor: true,
      dica: "Cupons do PDV com ao menos um item do nível",
      cell: (l) => <Pendente valor={l.cupons}>{formatInteiro(l.cupons ?? 0)}</Pendente>,
      ordenar: (l) => l.cupons,
    },
    {
      id: "var-cupons",
      titulo: "Cupons (PDV)",
      subtitulo: "Var. %",
      cell: (l) => <Pendente valor={l.variacaoCupons}>{delta(l.variacaoCupons, "%")}</Pendente>,
      ordenar: (l) => l.variacaoCupons,
    },
    {
      id: "itens",
      titulo: "Itens/Cupom",
      subtitulo: "Qtd",
      divisor: true,
      cell: (l) => <Pendente valor={l.itensPorCupom}>{formatDecimal(l.itensPorCupom)}</Pendente>,
      ordenar: (l) => l.itensPorCupom,
    },
    {
      id: "var-itens",
      titulo: "Itens/Cupom",
      subtitulo: "Var. %",
      cell: (l) => <Pendente valor={l.variacaoItensPorCupom}>{delta(l.variacaoItensPorCupom, "%")}</Pendente>,
      ordenar: (l) => l.variacaoItensPorCupom,
    },
    { id: "participacao", titulo: "Participação", subtitulo: "%", divisor: true, cell: (l) => formatPercentual(l.participacao), ordenar: (l) => l.participacao },
  ];
}

/**
 * Venda, margem, lucro, cupons, itens por cupom e participação por nível
 * mercadológico. Cada linha expande no nível de baixo (departamento → grupo →
 * subgrupo). Os cupons vêm de uma consulta separada e mais lenta (logpdv).
 */
export function DesempenhoTable({ filtros, totalCupons }: { filtros: Filtros; totalCupons: TotaisCupons | undefined }) {
  const [nivel, setNivel] = useState<Nivel>("departamento");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);

  // Níveis a partir da aba escolhida; os de baixo só carregam ao expandir uma linha.
  const niveis = ORDEM.slice(ORDEM.indexOf(nivel));
  const abertosNoNivel = (n: Nivel) => [...abertos].some((chave) => chave.startsWith(`${n}:`));
  const habilitado = (i: number) => i === 0 || (!!niveis[i] && abertosNoNivel(niveis[i - 1]));

  const nivelQuery = (i: number) => vendasQueries.niveis(filtros, niveis[i] ?? nivel);
  const cuponsQuery = (i: number) => vendasQueries.cuponsNiveis(filtros, niveis[i] ?? nivel);
  // Número fixo de hooks: um par de consultas por nível possível.
  const vendas = [
    useQuery({ ...nivelQuery(0), enabled: nivelQuery(0).enabled !== false && habilitado(0) }),
    useQuery({ ...nivelQuery(1), enabled: nivelQuery(1).enabled !== false && habilitado(1) }),
    useQuery({ ...nivelQuery(2), enabled: nivelQuery(2).enabled !== false && habilitado(2) }),
  ];
  const cupons = [
    useQuery({ ...cuponsQuery(0), enabled: cuponsQuery(0).enabled !== false && habilitado(0) }),
    useQuery({ ...cuponsQuery(1), enabled: cuponsQuery(1).enabled !== false && habilitado(1) }),
    useQuery({ ...cuponsQuery(2), enabled: cuponsQuery(2).enabled !== false && habilitado(2) }),
  ];

  const base = vendas[0];
  const vendaTotal = (base.data?.linhas ?? []).reduce((t, l) => t + l.venda, 0);

  // Algumas centenas de linhas: calcular a cada render é barato.
  const linhasPorNivel = niveis.map((_, i) => {
    const cuponsPendentes = carregando(cupons[i]);
    const porCodigo = new Map(cupons[i].data?.linhas.map((c) => [c.codigo, c]));
    return (vendas[i].data?.linhas ?? []).map((l) =>
      calcularDesempenho(l, cuponsPendentes ? undefined : (porCodigo.get(l.codigo) ?? null), vendaTotal),
    );
  });

  const termo = buscaAdiada.trim().toLocaleLowerCase("pt-BR");
  const raiz = linhasPorNivel[0].filter((l) => !termo || l.descricao.toLocaleLowerCase("pt-BR").includes(termo));

  // O React Compiler memoriza estes cálculos.
  const soma = (base.data?.linhas ?? []).reduce(
    (t, l) => ({
      venda: t.venda + l.venda,
      custo: t.custo + l.custo,
      vendaAnterior: t.vendaAnterior + l.vendaAnterior,
      custoAnterior: t.custoAnterior + l.custoAnterior,
    }),
    { venda: 0, custo: 0, vendaAnterior: 0, custoAnterior: 0 },
  );
  // Cupons do total: cupons distintos do período (um cupom conta uma vez só,
  // diferente da soma das linhas).
  const total = calcularDesempenho(
    { codigo: 0, descricao: "Total", pai: null, ...soma },
    totalCupons ? { codigo: 0, ...totalCupons } : undefined,
    vendaTotal,
  );

  const alternar = (chave: string) =>
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });

  const rotuloNivel = NIVEIS.find((n) => n.value === nivel)!.label;

  const exportar = () => {
    const linhasCsv: (string | number | null | undefined)[][] = [];
    const adicionar = (profundidade: number, lista: LinhaDesempenho[]) => {
      for (const l of lista) {
        linhasCsv.push([
          NIVEIS.find((n) => n.value === niveis[profundidade])!.label,
          l.descricao,
          l.venda,
          l.variacaoVenda,
          l.margem,
          l.variacaoMargemPp,
          l.lucro,
          l.variacaoLucro,
          l.cupons,
          l.variacaoCupons,
          l.itensPorCupom,
          l.variacaoItensPorCupom,
          l.participacao,
        ]);
        if (abertos.has(`${niveis[profundidade]}:${l.codigo}`) && linhasPorNivel[profundidade + 1]) {
          adicionar(profundidade + 1, linhasPorNivel[profundidade + 1].filter((f) => f.pai === l.codigo));
        }
      }
    };
    adicionar(0, raiz);
    linhasCsv.push(["", "Total", total.venda, total.variacaoVenda, total.margem, total.variacaoMargemPp, total.lucro,
      total.variacaoLucro, total.cupons, total.variacaoCupons, total.itensPorCupom, total.variacaoItensPorCupom, 100]);
    baixarCsv(
      `desempenho-vendas-${nivel}-${filtros.periodo.inicio}-a-${filtros.periodo.fim}.csv`,
      ["Nível", "Descrição", "Venda (R$)", "Var. venda (%)", "Margem bruta (%)", "Var. margem (p.p.)",
        "Lucro bruto (R$)", "Var. lucro (%)", "Cupons", "Var. cupons (%)", "Itens por cupom", "Var. itens/cupom (%)",
        "Participação (%)"],
      linhasCsv,
    );
  };

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiStoreOutline} size={0.9} className="text-primary" aria-hidden />
          Desempenho de Vendas por {rotuloNivel}
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
              colunas={colunasDesempenho(rotuloNivel)}
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
                  carregando: carregando(vendas[p + 1]),
                }),
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
