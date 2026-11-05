"use client";

import Icon from "@mdi/react";
import { mdiArrowExpandAll } from "@mdi/js";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Botão (ícone pequeno no cabeçalho do card) que abre o gráfico ampliado numa
 * janela, com legenda e eixos mais detalhados. `children` é o gráfico em modo
 * `detalhado`; ele preenche a altura da janela (ResponsiveContainer a 100%).
 */
export function ExpandirGrafico({
  titulo,
  descricao,
  legenda,
  children,
  desabilitado,
  rolavel,
  compacto,
  className = "",
}: {
  titulo: string;
  descricao?: ReactNode;
  /** Legenda maior, mostrada acima do gráfico ampliado. */
  legenda?: ReactNode;
  children: ReactNode;
  /** Sem dados para ampliar. */
  desabilitado?: boolean;
  /** Conteúdo em lista (barras de ranking), que rola dentro da janela em vez de se ajustar a ela. */
  rolavel?: boolean;
  /** Botão menor, para cantos de minigráficos. */
  compacto?: boolean;
  /** Classes do botão (posição, quando ele fica sobre outro elemento). */
  className?: string;
}) {
  return (
    <Dialog>
      <Tooltip conteudo="Ampliar gráfico">
        <DialogTrigger
          disabled={desabilitado}
          aria-label={`Ampliar gráfico: ${titulo}`}
          className={`flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 ${compacto ? "size-5" : "size-7"} ${className}`}
        >
          <Icon path={mdiArrowExpandAll} size={compacto ? 0.55 : 0.7} aria-hidden />
        </DialogTrigger>
      </Tooltip>
      <DialogContent titulo={titulo} descricao={descricao} className="max-w-6xl">
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
          {legenda}
          <div className={`rounded-xl border px-2 py-3 ${rolavel ? "max-h-[62vh] overflow-auto px-4" : "h-[min(62vh,640px)] min-h-72"}`}>{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
