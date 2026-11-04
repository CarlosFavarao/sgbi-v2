"use client";

import Icon from "@mdi/react";
import { mdiChevronRight, mdiDownload, mdiTableLarge } from "@mdi/js";
import { Fragment, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { variacao } from "@/lib/calc";
import { baixarCsv } from "@/lib/csv";
import { formatMesAno, formatMoeda, formatVariacao } from "@/lib/format";
import type { Dfc } from "../compute";
import type { AtividadeDfc } from "../types";

export type ModoDfc = "valores" | "percentual" | "acumulado";
const MODOS: { value: ModoDfc; label: string }[] = [
  { value: "valores", label: "Valores" },
  { value: "percentual", label: "% do Total" },
  { value: "acumulado", label: "Acumulado no ano" },
];

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const COR_ATIVIDADE: Record<AtividadeDfc, string> = {
  operacional: "bg-summary-green-bg",
  investimento: "bg-summary-blue-bg",
  financiamento: "bg-summary-purple-bg",
};

/** Saídas e valores negativos com sinal de menos e em vermelho. */
function Valor({ v, saida, forte }: { v: number | null; saida?: boolean; forte?: boolean }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const negativo = saida ? v !== 0 : v < 0;
  const texto = formatMoeda(Math.abs(v));
  return (
    <span className={`tabular-nums ${negativo ? "text-error" : ""} ${forte ? "font-semibold" : ""}`}>
      {negativo ? `-${texto}` : texto}
    </span>
  );
}

const pct = (v: number, base: number) =>
  base ? `${((v / base) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "—";

const th = "px-2.5 py-1.5 font-medium";
const td = "px-2.5 py-1 text-right";

/**
 * DFC gerencial por atividade, com o mês, a comparação, a variação e o % sobre
 * as entradas operacionais. Cada linha abre os grupos da DRE que a compõem, e
 * os subgrupos de despesa abrem os itens.
 */
export function DfcTable({
  atual,
  anterior,
  mes,
  mesComparacao,
  modo,
  onModo,
  carregando,
}: {
  atual: Dfc;
  anterior: Dfc | null;
  mes: string;
  mesComparacao: string;
  modo: ModoDfc;
  onModo: (modo: ModoDfc) => void;
  carregando: boolean;
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const alternar = (chave: string) =>
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });

  const base = atual.atividades.find((a) => a.id === "operacional")!.entradas;
  const anteriorDe = (atividade: AtividadeDfc, linha?: string, folha?: string, item?: string) => {
    const a = anterior?.atividades.find((x) => x.id === atividade);
    if (!a) return null;
    if (!linha) return a.liquido;
    const l = a.linhas.find((x) => x.config.id === linha);
    if (!l) return null;
    if (!folha) return l.valor;
    const f = l.folhas.find((x) => x.id === folha);
    if (!f) return 0;
    if (!item) return f.valor;
    return f.itens.find((x) => x.id === item)?.valor ?? 0;
  };
  const sufixo = modo === "acumulado" ? " (acum.)" : "";
  const colunas = (v: number, comp: number | null, saida?: boolean, forte?: boolean) => (
    <>
      <td className={td}>
        {modo === "percentual" ? pct(saida ? -v : v, base) : <Valor v={v} saida={saida} forte={forte} />}
      </td>
      <td className={td}>
        {modo === "percentual" ? (
          comp == null ? (
            "—"
          ) : (
            pct(saida ? -comp : comp, anterior?.atividades[0].entradas ?? 0)
          )
        ) : (
          <Valor v={comp} saida={saida} forte={forte} />
        )}
      </td>
      <td className={`${td} tabular-nums`}>{formatVariacao(variacao(v, comp))}</td>
      <td className={`${td} tabular-nums text-muted-foreground`}>{pct(saida ? -v : v, base)}</td>
    </>
  );

  const exportar = () => {
    const linhas: (string | number | null)[][] = [];
    for (const a of atual.atividades) {
      linhas.push([a.label, a.liquido, anteriorDe(a.id)]);
      for (const l of a.linhas) {
        const s = l.config.tipo === "saida" ? -1 : 1;
        linhas.push([`  ${l.config.label}`, s * l.valor, s * (anteriorDe(a.id, l.config.id) ?? 0)]);
      }
    }
    linhas.push(["Geração líquida de caixa", atual.geracao, anterior?.geracao ?? null]);
    baixarCsv(
      `dfc-${mes}${modo === "acumulado" ? "-acumulado" : ""}.csv`,
      ["Linha", `${formatMesAno(mes)}${sufixo}`, `${formatMesAno(mesComparacao)}${sufixo}`],
      linhas,
    );
  };

  const chevron = (chave: string, aberto: boolean, rotulo: string) => (
    <button
      type="button"
      onClick={() => alternar(chave)}
      aria-expanded={aberto}
      aria-label={`${aberto ? "Recolher" : "Expandir"} ${rotulo}`}
      className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon path={mdiChevronRight} size={0.7} className={`transition-transform ${aberto ? "rotate-90" : ""}`} />
    </button>
  );

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiTableLarge} size={0.9} className="text-primary" aria-hidden />
          DFC Gerencial
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Modo da DFC" value={modo} options={MODOS} onChange={onModo} />
          <button
            type="button"
            onClick={exportar}
            className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon path={mdiDownload} size={0.75} aria-hidden />
            Exportar
          </button>
        </div>
      </CardHeader>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando}>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <table className="w-full border-collapse whitespace-nowrap text-[13px]">
            <thead className="sticky top-0 z-10 bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className={`${th} text-left`}>Categoria</th>
                <th className={`${th} text-right`}>
                  {formatMesAno(mes)}
                  {sufixo}
                </th>
                <th className={`${th} text-right`}>
                  {formatMesAno(mesComparacao)}
                  {sufixo}
                </th>
                <th className={`${th} text-right`}>Variação</th>
                <th className={`${th} text-right`} title="Sobre as entradas operacionais do período">
                  % das entradas
                </th>
              </tr>
            </thead>
            <tbody>
              {atual.atividades.map((a) => (
                <Fragment key={a.id}>
                  <tr className={`border-t font-semibold ${COR_ATIVIDADE[a.id]}`}>
                    <td className="max-w-72 truncate px-2.5 py-1.5" title={a.label}>
                      {a.label}
                    </td>
                    {colunas(a.liquido, anteriorDe(a.id), false, true)}
                  </tr>
                  {a.linhas
                    .filter((l) => l.valor || anteriorDe(a.id, l.config.id))
                    .map((l) => {
                      const chave = l.config.id;
                      const aberto = abertos.has(chave);
                      const saida = l.config.tipo === "saida";
                      return (
                        <Fragment key={chave}>
                          <tr className="border-t hover:bg-secondary/50">
                            <td className="max-w-72 py-1 pl-3 pr-2.5" title={l.config.label}>
                              <span className="flex items-center gap-1">
                                {chevron(chave, aberto, l.config.label)}
                                <span className="truncate">{l.config.label}</span>
                              </span>
                            </td>
                            {colunas(l.valor, anteriorDe(a.id, l.config.id), saida)}
                          </tr>
                          {aberto &&
                            l.folhas.map((f) => {
                              const chaveFolha = `${chave}:${f.id}:${f.descricao}`;
                              const folhaAberta = abertos.has(chaveFolha);
                              return (
                                <Fragment key={chaveFolha}>
                                  <tr className="border-t bg-secondary/25 text-muted-foreground hover:bg-secondary/50">
                                    <td className="max-w-72 py-1 pl-9 pr-2.5" title={f.descricao}>
                                      <span className="flex items-center gap-1">
                                        {f.itens.length ? (
                                          chevron(chaveFolha, folhaAberta, f.descricao)
                                        ) : (
                                          <span className="w-5" />
                                        )}
                                        <span className="truncate">{f.descricao}</span>
                                      </span>
                                    </td>
                                    {colunas(f.valor, anteriorDe(a.id, chave, f.id), saida)}
                                  </tr>
                                  {folhaAberta &&
                                    f.itens.map((i) => (
                                      <tr
                                        key={`${chaveFolha}:${i.id}:${i.descricao}`}
                                        className="border-t bg-secondary/40 text-xs text-muted-foreground"
                                      >
                                        <td className="max-w-72 truncate py-0.5 pl-16 pr-2.5" title={i.descricao}>
                                          {i.descricao}
                                        </td>
                                        {colunas(i.valor, anteriorDe(a.id, chave, f.id, i.id), saida)}
                                      </tr>
                                    ))}
                                </Fragment>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card font-semibold">
              <tr className="border-t-2">
                <td className="px-2.5 py-1.5">Geração Líquida de Caixa (1 + 2 + 3)</td>
                {colunas(atual.geracao, anterior?.geracao ?? null, false, true)}
              </tr>
            </tfoot>
          </table>
        </div>
        <LoadingOverlay ativo={carregando} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
