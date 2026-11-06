"use client";

import Icon from "@mdi/react";
import { mdiEyeOffOutline } from "@mdi/js";
import { useSortable } from "@dnd-kit/react/sortable";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { MAX_COLUNAS_ITEM_BLOCO, type ItemLayout } from "@/lib/layout";
import { AlcaBorda, pararArraste } from "./alca-borda";
import { animarSaida, MOLA, TRANSICAO_ORDENAR } from "./movimento";
import type { LayoutTela } from "./use-layout";

export type ItemDoBloco = { id: string; titulo: string; node: ReactNode };

/** Largura mínima de um KPI (px): define quantas colunas internas cabem no bloco. */
const LARGURA_MINIMA = 200;
const GAP = 10;

/**
 * Altura disponível para cada KPI: abaixo destes limites (px) o KPI esconde o
 * que é secundário (`data-altura` no bloco; ver `KpiCard`), em vez de o
 * conteúdo vazar para o card de baixo.
 */
const ALTURA_NORMAL = 86;
const ALTURA_BAIXA = 74;

export type AlturaItem = "normal" | "baixa" | "minima";

function ItemKpi({
  item,
  index,
  bloco,
  titulo,
  grade,
  colunas,
  larguraColuna,
  children,
}: {
  item: ItemLayout;
  index: number;
  bloco: string;
  titulo: string;
  grade: LayoutTela;
  colunas: number;
  larguraColuna: number;
  children: ReactNode;
}) {
  const { editando } = grade;
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index,
    group: `bloco:${bloco}`,
    type: "item-bloco",
    accept: "item-bloco",
    data: { bloco },
    disabled: !editando,
    transition: TRANSICAO_ORDENAR,
  });
  const elRef = useRef<HTMLDivElement | null>(null);
  const inicio = useRef(1);
  const maxW = Math.min(MAX_COLUNAS_ITEM_BLOCO, colunas);
  const w = Math.min(item.w, colunas);
  const larguraPara = (novo: number) => {
    const limitado = Math.min(Math.max(novo, 1), maxW);
    if (limitado !== item.w) grade.alterarItemBloco(bloco, item.id, { w: limitado });
  };
  const botao =
    "flex size-6 items-center justify-center rounded-md border bg-card/95 text-muted-foreground shadow-sm hover:text-foreground";

  return (
    <motion.div
      ref={(el: HTMLDivElement | null) => {
        ref(el);
        elRef.current = el;
      }}
      // Largura e posição animam com mola quando outro KPI muda (o arraste em si é do dnd-kit).
      layout={!isDragging}
      transition={MOLA}
      style={{ gridColumn: `span ${w} / span ${w}` }}
      className={`relative min-h-0 min-w-0 rounded-2xl transition-[box-shadow,scale] duration-300 ${isDragging ? "z-30 scale-[1.02] shadow-2xl" : ""}`}
    >
      <div
        inert={editando}
        className={`h-full *:h-full *:overflow-hidden ${editando ? "pointer-events-none select-none" : ""}`}
      >
        {children}
      </div>
      {editando && (
        // O KPI inteiro é a alça de arrastar (nada cobre o título); só o olho e a borda direita fazem outra coisa.
        <div
          ref={handleRef}
          role="button"
          tabIndex={0}
          aria-label={`Arrastar ${titulo}`}
          className="absolute inset-0 z-10 cursor-grab rounded-2xl border-[3px] border-primary/20 outline-none transition-colors duration-200 hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing dark:border-primary/15 dark:hover:border-primary/35"
        >
          <Tooltip conteudo="Ocultar">
            <button
              ref={pararArraste}
              type="button"
              onClick={() =>
                animarSaida(elRef.current, () => grade.alterarItemBloco(bloco, item.id, { visivel: false }))
              }
              aria-label={`Ocultar ${titulo}`}
              className={`${botao} absolute right-1 top-1 hover:text-error`}
            >
              <Icon path={mdiEyeOffOutline} size={0.6} aria-hidden />
            </button>
          </Tooltip>
          {maxW > 1 &&
            // Largura pelas bordas esquerda ou direita, em colunas do bloco (1 a 3).
            (["l", "r"] as const).map((borda) => (
              <AlcaBorda
                key={borda}
                borda={borda}
                rotulo={`Largura de ${titulo}: ${w} de até ${maxW} colunas (setas)`}
                aoIniciar={() => {
                  inicio.current = item.w;
                }}
                aoMover={(dx) =>
                  larguraPara(inicio.current + (borda === "l" ? -1 : 1) * Math.round(dx / (larguraColuna + GAP)))
                }
                aoTeclar={(dx) => larguraPara(item.w + (borda === "l" ? -dx : dx))}
                noTeclado={borda === "r"}
              />
            ))}
        </div>
      )}
    </motion.div>
  );
}

/** Quantas linhas os itens ocupam no fluxo da grade interna (para dividir a altura do bloco). */
function linhasOcupadas(itens: ItemLayout[], colunas: number) {
  let linhas = 0;
  let usadas = colunas;
  for (const i of itens) {
    const w = Math.min(i.w, colunas);
    if (usadas + w > colunas) {
      linhas++;
      usadas = 0;
    }
    usadas += w;
  }
  return Math.max(linhas, 1);
}

/**
 * Bloco de KPIs dentro de um card da grade: os KPIs fluem em ordem, em até
 * `maxColunas` colunas (menos quando o bloco é estreito). Na edição, cada KPI
 * pode ser arrastado, alargado pela borda direita ou ocultado; o espaço que
 * sobra fica vazio. Com pouca altura por KPI, o bloco marca `data-altura` e os
 * KPIs escondem comparativo e minigráfico.
 */
export function BlocoKpis({
  grade,
  bloco,
  itens,
  maxColunas,
}: {
  grade: LayoutTela;
  /** Id do bloco no layout (`layout.blocos`). */
  bloco: string;
  itens: ItemDoBloco[];
  maxColunas: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState({ largura: 0, altura: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setMedida({ largura: el.clientWidth, altura: el.clientHeight }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const colunas = medida.largura
    ? Math.max(1, Math.min(maxColunas, Math.floor((medida.largura + GAP) / (LARGURA_MINIMA + GAP))))
    : maxColunas;
  const larguraColuna = (medida.largura - (colunas - 1) * GAP) / colunas;

  const porId = new Map(itens.map((i) => [i.id, i]));
  const visiveis = (grade.layout.blocos[bloco] ?? []).filter((i) => i.visivel && porId.has(i.id));
  const linhas = linhasOcupadas(visiveis, colunas);
  // Só na grade (altura fixa): empilhado, o bloco cresce com o conteúdo.
  const alturaItem = grade.larga && medida.altura ? (medida.altura - (linhas - 1) * GAP) / linhas : Infinity;
  const altura: AlturaItem = alturaItem >= ALTURA_NORMAL ? "normal" : alturaItem >= ALTURA_BAIXA ? "baixa" : "minima";

  return (
    // As linhas internas dividem a altura do card da grade; abaixo de 2,25rem por KPI, o bloco rola.
    <div
      ref={ref}
      data-altura={altura}
      className="grid auto-rows-[minmax(2.25rem,1fr)] gap-2.5 overflow-y-auto!"
      style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}
    >
      {visiveis.map((item, index) => (
        <ItemKpi
          key={item.id}
          item={item}
          index={index}
          bloco={bloco}
          titulo={porId.get(item.id)!.titulo}
          grade={grade}
          colunas={colunas}
          larguraColuna={larguraColuna}
        >
          {porId.get(item.id)!.node}
        </ItemKpi>
      ))}
      {!visiveis.length && (
        <div className="col-span-full flex items-center justify-center rounded-2xl bg-secondary/30 text-sm text-muted-foreground ring-1 ring-border/60">
          Todos os indicadores estão ocultos
        </div>
      )}
    </div>
  );
}
