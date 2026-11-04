"use client";

import Icon from "@mdi/react";
import { mdiArrowRight, mdiDownload } from "@mdi/js";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

const th = "px-2 py-1 font-medium";
const td = "px-2 py-[3px]";

function Tabela({ produtos, lista, compacta }: { produtos: ProdutoResumo[]; lista: ListaProdutos; compacta?: boolean }) {
  const tipo = TIPO[lista];
  return (
    <table className="w-full border-collapse whitespace-nowrap text-xs">
      <thead className={`text-[11px] text-muted-foreground ${compacta ? "" : "sticky top-0 z-10"} bg-secondary`}>
        <tr>
          <th className={`${th} hidden text-left @[24rem]:table-cell`}>Código</th>
          <th className={`${th} w-full text-left`}>Produto</th>
          <th className={`${th} hidden text-left @[26rem]:table-cell`}>Dep.</th>
          {tipo === "variacao" ? (
            <>
              <th className={`${th} text-right`}>Venda</th>
              <th className={`${th} text-right`}>Var. %</th>
            </>
          ) : (
            <>
              <th className={`${th} text-right`}>Margem</th>
              <th className={`${th} text-right`}>Venda</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {produtos.map((p, i) => (
          <tr
            key={p.codigo}
            // Telas baixas (ex.: 1536 × 864): o card mostra uma linha a menos para caber sem rolar.
            className={`border-t hover:bg-secondary/50 ${compacta && i === 4 ? "[@media(max-height:900px)]:hidden" : ""}`}
          >
            <td className={`${td} hidden tabular-nums text-muted-foreground @[24rem]:table-cell`}>{p.codigo}</td>
            {/* Nome longo: corta com reticências e mostra o nome completo no título. */}
            <td className={`${td} max-w-0 truncate`} title={`${p.codigo} · ${p.descricao} · ${p.departamento}`}>
              {p.descricao}
            </td>
            <td className={`${td} hidden max-w-24 truncate text-muted-foreground @[26rem]:table-cell`} title={p.departamento}>
              {p.departamento}
            </td>
            {tipo === "variacao" ? (
              <>
                <td className={`${td} text-right tabular-nums`}>{formatMoeda(p.venda)}</td>
                <td className={`${td} text-right`}>
                  <Delta value={p.variacao} unidade="%" maiorMelhor />
                </td>
              </>
            ) : (
              <>
                <td className={`${td} text-right font-semibold tabular-nums ${lista === "maior-margem" ? "text-success" : "text-error"}`}>
                  {formatPercentual(p.margem)}
                </td>
                <td className={`${td} text-right tabular-nums`}>{formatMoeda(p.venda)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
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
