"use client";

import Icon from "@mdi/react";
import { mdiCheck, mdiEyeOutline, mdiPencilOutline, mdiRestore } from "@mdi/js";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { ocultos } from "@/lib/layout";
import type { LayoutTela } from "./use-layout";

const botao =
  "flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50";

/**
 * Lápis que liga a edição do layout da tela (D43). Na edição vira uma barra com
 * os cards ocultos (para mostrar de novo), "Restaurar padrão" e "Concluir".
 * Só aparece em telas `xl` ou maiores (abaixo, os cards ficam empilhados).
 */
export function BarraEdicao({
  grade,
  rotulos,
  rotulosBlocos = {},
}: {
  grade: LayoutTela;
  /** Nome de cada card, por id. */
  rotulos: Record<string, string>;
  /** Nome de cada bloco interno e dos itens dele (ex.: KPIs). */
  rotulosBlocos?: Record<string, { titulo: string; itens: Record<string, string> }>;
}) {
  const [confirmar, setConfirmar] = useState(false);

  if (!grade.editando) {
    return (
      <Tooltip conteudo="Personalizar layout">
        <button
          type="button"
          onClick={() => grade.setEditando(true)}
          aria-label="Personalizar layout da tela"
          className={`${botao} hidden w-9 justify-center px-0 xl:flex`}
        >
          <Icon path={mdiPencilOutline} size={0.75} aria-hidden />
        </button>
      </Tooltip>
    );
  }

  const escondidos = ocultos(grade.layout);
  const totalOcultos = escondidos.cards.length + Object.values(escondidos.blocos).reduce((t, ids) => t + ids.length, 0);

  return (
    <div
      role="toolbar"
      aria-label="Edição do layout"
      className="hidden items-center gap-2 rounded-xl border bg-card p-1 pl-3 shadow-xs xl:flex"
    >
      <span className="text-xs font-medium text-muted-foreground">Editando o layout</span>

      <Popover>
        <PopoverTrigger className={botao}>
          <Icon path={mdiEyeOutline} size={0.75} aria-hidden />
          Ocultos
          <span className="rounded-full bg-secondary px-1.5 text-xs tabular-nums text-muted-foreground">
            {totalOcultos}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <p className="px-1 pb-1.5 text-xs text-muted-foreground">Marque para mostrar de novo.</p>
          <Grupo titulo="Cards">
            {Object.entries(rotulos).map(([id, rotulo]) => (
              <Opcao
                key={id}
                rotulo={rotulo}
                visivel={!escondidos.cards.includes(id)}
                onMostrar={() => grade.mostrar(id)}
                onOcultar={() => grade.ocultar(id)}
              />
            ))}
          </Grupo>
          {Object.entries(rotulosBlocos).map(([bloco, { titulo, itens }]) => (
            <Grupo key={bloco} titulo={titulo}>
              {Object.entries(itens).map(([id, rotulo]) => (
                <Opcao
                  key={id}
                  rotulo={rotulo}
                  visivel={!escondidos.blocos[bloco]?.includes(id)}
                  onMostrar={() => grade.alterarItemBloco(bloco, id, { visivel: true })}
                  onOcultar={() => grade.alterarItemBloco(bloco, id, { visivel: false })}
                />
              ))}
            </Grupo>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={confirmar} onOpenChange={setConfirmar}>
        <PopoverTrigger className={botao}>
          <Icon path={mdiRestore} size={0.75} aria-hidden />
          Restaurar padrão
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3">
          <p className="text-sm">Voltar à disposição, aos tamanhos e à visibilidade padrão dos cards?</p>
          <div className="mt-3 flex justify-end gap-2">
            <PopoverClose className="h-8 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary">
              Cancelar
            </PopoverClose>
            <button
              type="button"
              onClick={() => {
                grade.restaurarPadrao();
                setConfirmar(false);
                grade.setEditando(false);
              }}
              className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-accent"
            >
              Restaurar
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => grade.setEditando(false)}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon path={mdiCheck} size={0.75} aria-hidden />
        Concluir
      </button>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-1 first-of-type:mt-0">
      <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function Opcao({
  rotulo,
  visivel,
  onMostrar,
  onOcultar,
}: {
  rotulo: string;
  visivel: boolean;
  onMostrar: () => void;
  onOcultar: () => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-secondary">
        <Checkbox checked={visivel} onCheckedChange={(c) => (c ? onMostrar() : onOcultar())} />
        <span className="truncate">{rotulo}</span>
      </label>
    </li>
  );
}
