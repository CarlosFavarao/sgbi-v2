"use client";

import Icon from "@mdi/react";
import { mdiArrowRight, mdiDownload } from "@mdi/js";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { baixarCsv } from "@/lib/csv";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { VENDAS_CONFIG } from "../config";
import type { ListaProdutos, ProdutoResumo } from "../types";

/** Listas de variação mostram a Var. %; listas de margem mostram a margem. */
const TIPO: Record<ListaProdutos, "variacao" | "margem"> = {
  queda: "variacao",
  crescimento: "variacao",
  "maior-margem": "margem",
  "menor-margem": "margem",
};

function colunasProdutos(tipo: "variacao" | "margem", lista: ListaProdutos): Coluna<ProdutoResumo>[] {
  const venda: Coluna<ProdutoResumo> = { id: "venda", titulo: "Venda", cell: (p) => formatMoeda(p.venda), ordenar: (p) => p.venda };
  return [
    {
      id: "codigo",
      titulo: "Código",
      align: "left",
      className: "hidden text-muted-foreground @[24rem]:table-cell",
      cell: (p) => p.codigo,
      ordenar: (p) => p.codigo,
    },
    {
      id: "produto",
      titulo: "Produto",
      align: "left",
      // Nome longo: corta com reticências e mostra o nome completo no título.
      className: "w-full max-w-0 truncate",
      cell: (p) => <span title={`${p.codigo} · ${p.descricao} · ${p.departamento}`}>{p.descricao}</span>,
      ordenar: (p) => p.descricao,
    },
    {
      id: "departamento",
      titulo: "Dep.",
      align: "left",
      className: "hidden max-w-24 truncate text-muted-foreground @[26rem]:table-cell",
      cell: (p) => <span title={p.departamento}>{p.departamento}</span>,
      ordenar: (p) => p.departamento,
    },
    ...(tipo === "variacao"
      ? [
          venda,
          {
            id: "variacao",
            titulo: "Var. %",
            cell: (p: ProdutoResumo) => <Delta value={p.variacao} unidade="%" maiorMelhor />,
            ordenar: (p: ProdutoResumo) => p.variacao,
          },
        ]
      : [
          {
            id: "margem",
            titulo: "Margem",
            cell: (p: ProdutoResumo) => (
              <span className={`font-semibold ${lista === "maior-margem" ? "text-success" : "text-error"}`}>
                {formatPercentual(p.margem)}
              </span>
            ),
            ordenar: (p: ProdutoResumo) => p.margem,
          },
          venda,
        ]),
  ];
}

function Tabela({ produtos, lista, compacta }: { produtos: ProdutoResumo[]; lista: ListaProdutos; compacta?: boolean }) {
  return (
    <DataTable
      colunas={colunasProdutos(TIPO[lista], lista)}
      linhas={produtos}
      chave={(p) => String(p.codigo)}
      densidade="compacto"
      cabecalhoFixo={!compacta}
      vazio={null}
      // Telas baixas (ex.: 1536 × 864): o card mostra uma linha a menos para caber sem rolar.
      classeLinha={(_, __, i) => (compacta && i === 4 ? "[@media(max-height:900px)]:hidden" : "")}
    />
  );
}

export function ProdutosLista({
  titulo,
  descricao,
  lista,
  produtos,
  carregando,
}: {
  titulo: string;
  /** Explica o critério da lista (tooltip e janela "Ver todos"). */
  descricao: string;
  lista: ListaProdutos;
  produtos: ProdutoResumo[] | undefined;
  carregando: boolean;
}) {
  const todos = produtos ?? [];
  const exportar = () =>
    baixarCsv(
      `${titulo.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.csv`,
      ["Código", "Produto", "Departamento", "Classe", "Venda (R$)", "Venda anterior (R$)", "Var. (%)", "Lucro bruto (R$)", "Margem (%)"],
      todos.map((p) => [p.codigo, p.descricao, p.departamento, p.classe, p.venda, p.vendaAnterior, p.variacao, p.lucro, p.margem]),
    );

  return (
    <Card className="@container min-w-0">
      <Dialog>
        <CardHeader className="flex-nowrap!">
          <CardTitle className="min-w-0 truncate text-sm" title={descricao}>
            {titulo}
          </CardTitle>
          <DialogTrigger
            disabled={!todos.length}
            className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
          >
            Ver todos
            <Icon path={mdiArrowRight} size={0.55} aria-hidden />
          </DialogTrigger>
        </CardHeader>
        <DialogContent titulo={titulo} descricao={descricao} className="max-w-3xl">
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{todos.length} produtos</span>
              <button
                type="button"
                onClick={exportar}
                className="flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs hover:border-primary/60 hover:text-primary"
              >
                <Icon path={mdiDownload} size={0.65} aria-hidden />
                Exportar
              </button>
            </div>
            <div className="@container min-h-0 flex-1 overflow-auto rounded-lg border">
              <Tabela produtos={todos} lista={lista} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="relative px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="overflow-hidden rounded-lg border">
          <Tabela produtos={todos.slice(0, VENDAS_CONFIG.linhasNoCard)} lista={lista} compacta />
          {!carregando && !todos.length && (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum produto no período.</p>
          )}
        </div>
        <LoadingOverlay ativo={carregando} label={titulo} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
