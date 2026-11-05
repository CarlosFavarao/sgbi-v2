"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Área clicável de um card com gráfico: ao clicar (ou Enter/Espaço com foco),
 * abre o gráfico ampliado numa janela, com legenda e eixos mais detalhados.
 * `children` é o gráfico pequeno do card; `detalhe`, o mesmo gráfico em modo
 * `detalhado`, que preenche a altura da janela (ResponsiveContainer a 100%).
 */
export function ExpandirGrafico({
  titulo,
  descricao,
  legenda,
  filtros,
  detalhe,
  children,
  desabilitado,
  ocupado,
  rolavel,
  className = "",
}: {
  titulo: string;
  descricao?: ReactNode;
  /** Legenda maior, mostrada acima do gráfico ampliado. */
  legenda?: ReactNode;
  /** Os filtros do card (agrupamento, medida...), repetidos na janela: ela compartilha o estado do card. */
  filtros?: ReactNode;
  detalhe: ReactNode;
  children: ReactNode;
  /** Sem dados (ou carregando): a área deixa de ser clicável. */
  desabilitado?: boolean;
  /** Repassado como `aria-busy`. */
  ocupado?: boolean;
  /** Conteúdo em lista (barras de ranking), que rola dentro da janela em vez de se ajustar a ela. */
  rolavel?: boolean;
  /** Classes da área do gráfico (altura, espaçamento, `relative` para o carregando). */
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    setAberto(true);
  };

  return (
    <>
      <div
        {...(desabilitado
          ? {}
          : {
              role: "button",
              tabIndex: 0,
              "aria-label": `Ampliar gráfico: ${titulo}`,
              "aria-haspopup": "dialog" as const,
              onClick: () => setAberto(true),
              onKeyDown: aoTeclar,
            })}
        aria-busy={ocupado}
        className={`${className} ${desabilitado ? "" : "cursor-zoom-in rounded-xl outline-none transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-ring"}`}
      >
        {children}
      </div>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent titulo={titulo} descricao={descricao} className="max-w-6xl">
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
            {(legenda || filtros) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">{legenda}</div>
                {filtros}
              </div>
            )}
            <div
              className={`rounded-xl border px-2 py-3 ${rolavel ? "max-h-[62vh] overflow-auto px-4" : "h-[min(62vh,640px)] min-h-72"}`}
            >
              {detalhe}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
