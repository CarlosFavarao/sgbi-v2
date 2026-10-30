"use client";

import Icon from "@mdi/react";
import { mdiAlertCircle, mdiCheckCircle, mdiCloseCircle, mdiCubeOutline, mdiMagnify } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { calcularLinha, type LinhaCalculada, type Situacao } from "../compute";
import { formatMoeda, formatPercentual, formatPontos } from "../format";
import { painelQueries } from "../queries";
import type { Filtros, Nivel } from "../types";
import { Delta } from "./kpi-card";

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

function SituacaoBadge({ situacao }: { situacao: Situacao | null }) {
  if (!situacao) return <span className="text-muted-foreground">—</span>;
  const s = SITUACOES[situacao];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${s.className}`}>
      <Icon path={s.icon} size={0.6} aria-hidden />
      {s.label}
    </span>
  );
}

/** Variação em p.p. da compra sobre venda: subir é ruim. */
function PontosCompra({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cor = Math.abs(value) < 0.05 ? "text-muted-foreground" : value > 0 ? "text-error" : "text-success";
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

const th = "px-3 py-1.5 font-medium";

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
            <table className="w-full min-w-[56rem] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th rowSpan={2} className={`${th} text-left`}>
                    {rotuloNivel}
                  </th>
                  <th colSpan={2} className={`${th} border-l`}>Compras</th>
                  <th colSpan={2} className={`${th} border-l`}>Venda</th>
                  <th colSpan={2} className={`${th} border-l`}>Compra sobre Venda</th>
                  <th rowSpan={2} className={`${th} border-l`}>Situação</th>
                </tr>
                <tr>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} text-right`}>Var. %</th>
                  <th className={`${th} border-l text-right`}>Valor</th>
                  <th className={`${th} text-right`}>Var. %</th>
                  <th className={`${th} border-l text-right`}>%</th>
                  <th className={`${th} text-right`}>Var. p.p.</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l) => (
                  <tr key={l.codigo} className="border-t hover:bg-secondary/50">
                    <td className="px-3 py-1 font-medium">{l.descricao}</td>
                    <td className="px-3 py-1 text-right tabular-nums">{formatMoeda(l.compra)}</td>
                    <td className="px-3 py-1 text-right">
                      <Delta value={l.variacaoCompra} unidade="%" maiorMelhor={false} />
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{formatMoeda(l.venda)}</td>
                    <td className="px-3 py-1 text-right">
                      <Delta value={l.variacaoVenda} unidade="%" maiorMelhor />
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{formatPercentual(l.compraSobreVenda)}</td>
                    <td className="px-3 py-1 text-right">
                      <PontosCompra value={l.variacaoPp} />
                    </td>
                    <td className="px-3 py-1 text-center">
                      <SituacaoBadge situacao={l.situacao} />
                    </td>
                  </tr>
                ))}
                {!filtradas.length && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum resultado.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card font-semibold">
                <tr className="border-t-2">
                  <td className="px-3 py-1.5">Total</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMoeda(total.compra)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Delta value={total.variacaoCompra} unidade="%" maiorMelhor={false} />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMoeda(total.venda)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Delta value={total.variacaoVenda} unidade="%" maiorMelhor />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatPercentual(total.compraSobreVenda)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <PontosCompra value={total.variacaoPp} />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <SituacaoBadge situacao={total.situacao} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
        <LoadingOverlay ativo={carregando} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
