"use client";

import Icon from "@mdi/react";
import { mdiDrag, mdiEyeOffOutline } from "@mdi/js";
import { Feedback } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDraggable } from "@dnd-kit/react";
import { flushSync } from "react-dom";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  alturaTotal,
  COLUNAS,
  encontrar,
  limitesDe,
  posicionar,
  semMoverArrastado,
  trocar,
  type Borda,
  type ItemLayout,
  type Layout,
} from "@/lib/layout";
import { CardBloqueado } from "@/components/acesso/card-bloqueado";
import { useAcesso } from "@/components/acesso/contexto";
import type { Fonte } from "@/lib/acesso";
import { AlcaBorda, pararArraste } from "./alca-borda";
import { animarDesde, animarSaida, MOLA, MOLA_PREVIA } from "./movimento";
import type { LayoutTela } from "./use-layout";

/** Espaço entre cards (gap-2.5). */
export const GAP = 10;
/** Altura mínima de uma unidade de linha (px): em telas baixas a página rola. */
const UNIDADE_MINIMA = 30;
/** Unidade fixa abaixo de `xl` (cards empilhados). */
const UNIDADE_EMPILHADA = 40;
/** Padding inferior da página. */
const MARGEM_INFERIOR = 12;
/** Linhas vazias a mais no fim da grade durante a edição (espaço para soltar cards embaixo de tudo). */
const LINHAS_EXTRAS = 4;
/** Larguras e alturas (px) abaixo das quais o card avisa o conteúdo para se compactar. */
const ESTREITO_PX = 380;
const BAIXO_PX = 230;
/** Tempo (ms) em que o card recém-solto fica fora da animação de layout, enquanto desliza até o lugar. */
const DURACAO_SOLTO = 800;

/** Altura em px de `h` unidades (os espaços entre unidades contam, como numa grade). */
export const alturaPx = (h: number, unidade: number) => h * unidade + (h - 1) * GAP;

/**
 * Altura da unidade de linha: o layout padrão (`totalPadrao` unidades) ocupa o
 * resto da tela sem rolar. Um layout maior que o padrão faz a página rolar.
 */
function useUnidade(ref: RefObject<HTMLElement | null>, totalPadrao: number) {
  const [unidade, setUnidade] = useState(36);
  useLayoutEffect(() => {
    const calcular = () => {
      const topo = (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      const disponivel = window.innerHeight - topo - MARGEM_INFERIOR;
      setUnidade(Math.max(UNIDADE_MINIMA, Math.floor((disponivel - (totalPadrao - 1) * GAP) / totalPadrao)));
    };
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, [ref, totalPadrao]);
  return unidade;
}

/** Largura de uma coluna (px) da grade de 12 colunas. */
function useColuna(ref: RefObject<HTMLElement | null>) {
  const [coluna, setColuna] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setColuna((el.clientWidth - (COLUNAS - 1) * GAP) / COLUNAS));
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return coluna;
}

const BORDAS: Borda[] = ["l", "r", "t", "b", "tl", "tr", "bl", "br"];
const NOME_BORDA: Record<Borda, string> = {
  l: "pela borda esquerda",
  r: "pela borda direita",
  t: "pela borda de cima",
  b: "pela borda de baixo",
  tl: "pelo canto superior esquerdo",
  tr: "pelo canto superior direito",
  bl: "pelo canto inferior esquerdo",
  br: "pelo canto inferior direito",
};

/**
 * O que acontece ao soltar o card arrastado: ir para a célula (`x`, `y`) ou
 * trocar de lugar com o card que está sob o ponteiro.
 */
export type Previa = { tipo: "posicao"; id: string; x: number; y: number } | { tipo: "troca"; id: string; com: string };

/** Card que acabou de ser solto e a caixa (na tela) de onde ele parte. */
type Solto = { id: string; de: DOMRect };

/** Tamanho ao vivo durante o redimensionamento: o card segue o ponteiro em px. */
type AoVivo = { largura: number; altura: number; ancoraDireita: boolean; ancoraBaixo: boolean };

const posicaoNaGrade = (i: { x: number; y: number; w: number; h: number }) => ({
  gridColumn: `${i.x + 1} / span ${i.w}`,
  gridRow: `${i.y + 1} / span ${i.h}`,
});

function CardDaGrade({
  item,
  grade,
  rotulo,
  unidade,
  coluna,
  bloco,
  solto,
  children,
}: {
  item: ItemLayout;
  grade: LayoutTela;
  rotulo: string;
  unidade: number;
  coluna: number;
  /** Card com itens editáveis dentro (ex.: KPIs): o conteúdo continua interativo na edição. */
  bloco: boolean;
  solto: Solto | null;
  children: ReactNode;
}) {
  const { editando, limites } = grade;
  const travar = editando && !bloco;
  const { ref, handleRef, isDragging } = useDraggable({ id: item.id, type: "card", disabled: !editando });
  const elRef = useRef<HTMLDivElement | null>(null);
  const inicio = useRef<{ x: number; y: number; w: number; h: number; ret: DOMRect } | null>(null);
  const [aoVivo, setAoVivo] = useState<AoVivo | null>(null);
  // Deslocamento encaixado (colunas e linhas) do redimensionamento em andamento, aplicado ao soltar.
  const alvo = useRef<{ colunas: number; linhas: number } | null>(null);
  const acabouDeCair = solto?.id === item.id;

  // O card solto sai de onde foi largado e desliza (mola) até o lugar novo.
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!acabouDeCair || !el || !solto) return;
    // Destino calculado pela grade: o dnd-kit só devolve o card à célula depois deste efeito.
    const grid = el.parentElement?.getBoundingClientRect();
    const para = grid && { left: grid.left + item.x * (coluna + GAP), top: grid.top + item.y * (unidade + GAP) };
    animarDesde(el, solto.de, para);
  }, [acabouDeCair, solto, item.x, item.y, coluna, unidade]);

  const lim = limitesDe(limites, item.id);
  const passo = { x: coluna + GAP, y: unidade + GAP };
  const larguraPx = item.w * coluna + (item.w - 1) * GAP;
  const alturaCard = alturaPx(item.h, unidade);

  const iniciar = (borda: Borda) => {
    const ret = elRef.current!.getBoundingClientRect();
    inicio.current = { x: item.x, y: item.y, w: item.w, h: item.h, ret };
    setAoVivo({
      largura: ret.width,
      altura: ret.height,
      ancoraDireita: borda.includes("l"),
      ancoraBaixo: borda.includes("t"),
    });
  };

  /** Novo tamanho a partir do deslocamento da borda, em colunas e linhas. */
  const aplicar = (
    borda: Borda,
    colunas: number,
    linhas: number,
    base: { x: number; y: number; w: number; h: number },
  ) => {
    const esq = borda.includes("l");
    const cima = borda.includes("t");
    grade.redimensionar(
      item.id,
      {
        x: esq ? base.x + colunas : base.x,
        y: cima ? base.y + linhas : base.y,
        w: esq ? base.w - colunas : borda.includes("r") ? base.w + colunas : base.w,
        h: cima ? base.h - linhas : borda.includes("b") ? base.h + linhas : base.h,
      },
      borda,
    );
  };

  // O card acompanha o ponteiro em px (dentro dos limites); a grade encaixa na coluna/linha mais próxima.
  const mover = (borda: Borda) => (dx: number, dy: number) => {
    const i = inicio.current;
    if (!i) return;
    const px = (w: number) => w * coluna + (w - 1) * GAP;
    // Até a borda da grade: pela esquerda, até a coluna 0; pela direita, até a 12.
    const maxW = borda.includes("l")
      ? Math.min(lim.max.w, i.x + i.w)
      : borda.includes("r")
        ? Math.min(lim.max.w, COLUNAS - i.x)
        : i.w;
    const maxH = borda.includes("t") ? Math.min(lim.max.h, i.y + i.h) : lim.max.h;
    const dw = borda.includes("l") ? -dx : borda.includes("r") ? dx : 0;
    const dh = borda.includes("t") ? -dy : borda.includes("b") ? dy : 0;
    setAoVivo({
      largura: Math.min(Math.max(i.ret.width + dw, px(lim.min.w)), px(maxW)),
      altura: Math.min(Math.max(i.ret.height + dh, alturaPx(lim.min.h, unidade)), alturaPx(maxH, unidade)),
      ancoraDireita: borda.includes("l"),
      ancoraBaixo: borda.includes("t"),
    });
    // Só a seleção acompanha o ponteiro; o card e a grade não mudam até soltar.
    alvo.current = { colunas: Math.round(dx / passo.x), linhas: Math.round(dy / passo.y) };
  };

  // Ao soltar, o card assume o tamanho encaixado de uma vez (a mola do layout o leva até lá).
  const soltar = (borda: Borda) => {
    const i = inicio.current;
    const a = alvo.current;
    inicio.current = null;
    alvo.current = null;
    setAoVivo(null);
    if (i && a) aplicar(borda, a.colunas, a.linhas, i);
  };

  return (
    <motion.div
      ref={(el: HTMLDivElement | null) => {
        ref(el);
        elRef.current = el;
      }}
      // Posição e tamanho animam com mola (Motion). O card arrastado é movido pelo dnd-kit e o recém-solto
      // anima à parte (`animarDesde`): os dois ficam fora da animação de layout.
      layout={!isDragging && !acabouDeCair}
      transition={MOLA}
      data-card={item.id}
      style={posicaoNaGrade(item)}
      className={`relative min-h-0 min-w-0 ${isDragging ? "z-40" : aoVivo ? "z-30" : "z-10"}`}
    >
      <div
        className={`h-full rounded-2xl transition-[box-shadow,scale] duration-300 ${isDragging ? "scale-[1.015] shadow-2xl" : ""}`}
      >
        {/* Na edição o conteúdo não reage (não amplia gráfico nem ordena tabela sem querer). Card pequeno:
            `data-estreito`/`data-baixo` avisam o conteúdo para esconder o que é secundário. */}
        <div
          inert={travar}
          data-estreito={larguraPx < ESTREITO_PX || undefined}
          data-baixo={alturaCard < BAIXO_PX || undefined}
          className={`h-full *:h-full *:overflow-hidden ${travar ? "pointer-events-none select-none" : ""}`}
        >
          {children}
        </div>
        {editando && (
          // Card comum: a moldura inteira é a alça de arrastar. Bloco (KPIs): só a etiqueta, porque os
          // itens de dentro também se arrastam.
          <div
            ref={bloco ? undefined : handleRef}
            className={`absolute inset-0 z-10 rounded-2xl border-[3px] transition-colors duration-200 ${
              bloco ? "pointer-events-none *:pointer-events-auto" : "cursor-grab active:cursor-grabbing"
            } ${
              aoVivo || isDragging
                ? "border-primary/55"
                : "border-primary/20 hover:border-primary/45 dark:border-primary/15 dark:hover:border-primary/35"
            }`}
          >
            <div
              className={`absolute flex min-w-0 max-w-[calc(100%-1rem)] items-center gap-1 ${bloco ? "-top-3 left-1/2 -translate-x-1/2" : "left-2 top-2"}`}
            >
              <button
                ref={bloco ? handleRef : undefined}
                type="button"
                aria-label={`Arrastar ${rotulo}`}
                aria-roledescription="card arrastável"
                className="flex h-6 min-w-0 cursor-grab items-center gap-1 rounded-md border bg-card/95 px-1.5 text-xs font-medium text-muted-foreground shadow-sm active:cursor-grabbing"
              >
                <Icon path={mdiDrag} size={0.65} className="shrink-0" aria-hidden />
                <span className="truncate">{rotulo}</span>
              </button>
            </div>
            <div
              ref={pararArraste}
              className={`absolute flex items-center gap-1 ${bloco ? "-top-3 right-6" : "right-2 top-2"}`}
            >
              <span
                className={`rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums shadow-sm transition-colors ${
                  aoVivo ? "border-primary/40 bg-primary text-primary-foreground" : "bg-card/95 text-muted-foreground"
                }`}
                title="Largura (colunas) × altura (linhas)"
              >
                {item.w} × {item.h}
              </span>
              <Tooltip conteudo="Ocultar card">
                <button
                  type="button"
                  onClick={() => animarSaida(elRef.current, () => grade.ocultar(item.id))}
                  aria-label={`Ocultar ${rotulo}`}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-md border bg-card/95 text-muted-foreground shadow-sm hover:text-error"
                >
                  <Icon path={mdiEyeOffOutline} size={0.65} aria-hidden />
                </button>
              </Tooltip>
            </div>
            {BORDAS.map((borda) => (
              <AlcaBorda
                key={borda}
                borda={borda}
                rotulo={`Redimensionar ${rotulo} ${NOME_BORDA[borda]} (${item.w} colunas × ${item.h} linhas; setas)`}
                aoIniciar={() => iniciar(borda)}
                aoMover={mover(borda)}
                aoSoltar={() => soltar(borda)}
                aoTeclar={(dx, dy) => aplicar(borda, dx, dy, item)}
                noTeclado={borda.length === 1}
              />
            ))}
          </div>
        )}
      </div>
      {/* Redimensionando: uma seleção azul acompanha o ponteiro (como a seleção da área de trabalho); o card só
          assume o tamanho ao soltar. */}
      {aoVivo && (
        <div
          aria-hidden
          style={{
            width: aoVivo.largura,
            height: aoVivo.altura,
            ...(aoVivo.ancoraDireita ? { right: 0 } : { left: 0 }),
            ...(aoVivo.ancoraBaixo ? { bottom: 0 } : { top: 0 }),
          }}
          className="pointer-events-none absolute z-20 rounded-2xl border border-primary/70 bg-primary/20"
        />
      )}
    </motion.div>
  );
}

type Operacao = { source: { id: string | number; type?: unknown } | null };

/**
 * Grade personalizável da tela (D43): 12 colunas e linhas de altura fixa; cada
 * card tem posição (`x`, `y`) e tamanho (`w`, `h`). No modo de edição
 * (`BarraEdicao`) os cards são arrastados por qualquer ponto (dnd-kit),
 * redimensionados pelas quatro bordas e cantos e ocultados. Soltar sobre outro
 * card troca os dois de lugar; soltar num espaço vazio leva o card para aquela
 * coluna. Quem ficar por baixo desce e, em seguida, todos sobem até encostar no
 * card de cima, sem mudar de tamanho (os outros cards já se movem durante o
 * arraste). Animações com Motion; todos os
 * cards ficam num container só (mover não recria o card nem os gráficos dele).
 * Abaixo de `xl` os cards empilham, na ordem, sem edição.
 */
export function GradePersonalizavel({
  grade,
  cards,
  rotulos,
  blocos = [],
  fontes = {},
}: {
  grade: LayoutTela;
  /** Cards com itens editáveis dentro (ex.: `kpis`, com `BlocoKpis`). */
  blocos?: string[];
  /** Conteúdo de cada card, por id. */
  cards: Record<string, ReactNode>;
  /** Nome de cada card (alça de arrastar, lista de ocultos). */
  rotulos: Record<string, string>;
  /**
   * Fontes de dados que cada card usa (`FONTES` do `layout.ts` da tela): sem
   * alguma delas na plataforma, ou sem permissão, o card fica desabilitado (D46).
   */
  fontes?: Record<string, readonly Fonte[]>;
}) {
  const acesso = useAcesso();
  // O card desabilitado não monta o conteúdo, então as consultas internas dele não saem.
  const conteudo = (id: string) => {
    const b = acesso.bloqueio(id, fontes[id]);
    return b ? <CardBloqueado titulo={rotulos[id] ?? id} bloqueio={b} /> : cards[id];
  };
  const ref = useRef<HTMLDivElement>(null);
  const larga = grade.larga;
  const unidade = useUnidade(ref, alturaTotal(grade.padrao));
  const coluna = useColuna(ref);
  const { layout, limites, editando } = grade;
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [solto, setSolto] = useState<Solto | null>(null);
  // Distância do ponteiro até o canto do card ao pegá-lo (o card cai alinhado ao que se vê). Medida no
  // pointerdown, antes de o dnd-kit tirar o card do fluxo.
  const pegada = useRef({ x: 0, y: 0 });
  // Posição do ponteiro na tela, acompanhada pela janela durante a edição (a do dnd-kit não vem em
  // coordenadas da tela).
  const ponteiro = useRef({ x: 0, y: 0 });
  useLayoutEffect(() => {
    if (!editando) return;
    const acompanhar = (e: PointerEvent) => {
      ponteiro.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", acompanhar, { capture: true, passive: true });
    window.addEventListener("pointerdown", acompanhar, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointermove", acompanhar, { capture: true });
      window.removeEventListener("pointerdown", acompanhar, { capture: true });
    };
  }, [editando]);
  // Caixas dos cards no início do arraste (coordenadas da página): a troca usa estas, e não as da tela,
  // porque os outros cards já se movem durante o arraste.
  const caixas = useRef(new Map<string, { esquerda: number; topo: number; direita: number; base: number }>());

  const resultadoDe = (p: Previa | null): Layout | null => {
    if (!p) return null;
    return p.tipo === "troca" ? trocar(layout, p.id, p.com, limites) : posicionar(layout, p.id, p.x, p.y, limites);
  };

  // Durante o arraste, os outros cards já aparecem onde vão ficar; o arrastado continua na origem.
  const depois = resultadoDe(previa);
  const exibido = depois && previa ? semMoverArrastado(layout, depois, previa.id) : layout;
  const fantasma = depois && previa ? (encontrar(depois, previa.id) ?? null) : null;

  const calcularPrevia = ({ source }: Operacao): Previa | null => {
    if (source?.type !== "card") return null;
    const id = String(source.id);
    const atual = encontrar(layout, id);
    const el = ref.current;
    if (!atual || !el) return null;
    const { x: cx, y: cy } = ponteiro.current;
    const px = cx + window.scrollX;
    const py = cy + window.scrollY;
    for (const [outro, c] of caixas.current) {
      if (outro !== id && px >= c.esquerda && px <= c.direita && py >= c.topo && py <= c.base) {
        return { tipo: "troca", id, com: outro };
      }
    }
    const r = el.getBoundingClientRect();
    const x = Math.round((cx - pegada.current.x - r.left) / (coluna + GAP));
    const y = Math.round((cy - pegada.current.y - r.top) / (unidade + GAP));
    return {
      tipo: "posicao",
      id,
      x: Math.min(Math.max(x, 0), COLUNAS - atual.w),
      y: Math.max(y, 0),
    };
  };

  const atualizarPrevia = (operacao: Operacao) => {
    const nova = calcularPrevia(operacao);
    setPrevia((p) => (JSON.stringify(p) === JSON.stringify(nova) ? p : nova));
  };

  const visiveis = exibido.itens.filter((i) => i.visivel);

  /** Ao pegar um card: onde o ponteiro está nele e as caixas de todos os cards (para a troca). */
  const aoPegar = (e: React.PointerEvent) => {
    if (!editando) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-card]");
    if (!card || !ref.current?.contains(card)) return;
    const ret = card.getBoundingClientRect();
    pegada.current = { x: e.clientX - ret.left, y: e.clientY - ret.top };
    caixas.current = new Map();
    ref.current.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      const r = el.getBoundingClientRect();
      caixas.current.set(el.dataset.card!, {
        esquerda: r.left + window.scrollX,
        topo: r.top + window.scrollY,
        direita: r.right + window.scrollX,
        base: r.bottom + window.scrollY,
      });
    });
  };

  if (!larga) {
    return (
      <div ref={ref} className="flex flex-col gap-2.5">
        {[...visiveis]
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map((i) => (
            // Blocos (KPIs) ficam com a altura do conteúdo; os outros cards, com altura fixa.
            <div
              key={i.id}
              style={blocos.includes(i.id) ? undefined : { height: alturaPx(i.h, UNIDADE_EMPILHADA) }}
              className={blocos.includes(i.id) ? "" : "*:h-full"}
            >
              {conteudo(i.id)}
            </div>
          ))}
      </div>
    );
  }

  // Na edição, a grade mostra as células (e algumas linhas vazias a mais, para soltar embaixo de tudo).
  const linhas = alturaTotal(exibido) + (editando ? LINHAS_EXTRAS : 0);

  return (
    <DragDropProvider
      // Sem a animação de volta do dnd-kit: o card solto desliza (Motion) até o lugar novo.
      plugins={(padrao) => [...padrao, Feedback.configure({ dropAnimation: null })]}
      onDragMove={(event) => atualizarPrevia(event.operation)}
      onDragEnd={(event) => {
        const { source } = event.operation;
        // Recalcula com a posição final (o estado da prévia pode estar um evento atrás).
        const destino = event.canceled ? null : calcularPrevia(event.operation);
        setPrevia(null);
        if (!source) return;
        if (source.type === "card") {
          const de = source.element?.getBoundingClientRect();
          const depois = resultadoDe(destino);
          if (depois && de) {
            // Síncrono: o card novo precisa estar pronto antes de o dnd-kit tirá-lo do arraste; do contrário,
            // um quadro mostra o card no destino antes de a animação começar (a "piscada").
            flushSync(() => {
              setSolto({ id: String(source.id), de });
              grade.substituir(depois);
            });
            window.setTimeout(() => setSolto(null), DURACAO_SOLTO);
          }
        } else if (!event.canceled && source.type === "item-bloco") {
          const bloco = String((source.data as { bloco?: string }).bloco);
          const ids = (layout.blocos[bloco] ?? []).filter((i) => i.visivel).map((i) => i.id);
          grade.ordenarBloco(bloco, move(ids, event));
        }
      }}
    >
      <div
        ref={ref}
        onPointerDownCapture={aoPegar}
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))`, gridAutoRows: `${unidade}px`, gap: GAP }}
      >
        {/* Células da grade na edição (referência para encaixar e espaço para soltar). */}
        {editando &&
          Array.from({ length: linhas * COLUNAS }, (_, n) => (
            <div
              key={`celula-${n}`}
              aria-hidden
              style={{ gridColumn: (n % COLUNAS) + 1, gridRow: Math.floor(n / COLUNAS) + 1 }}
              className="rounded-lg bg-secondary/35 dark:bg-secondary/15"
            />
          ))}
        {visiveis.map((item) => (
          <CardDaGrade
            key={item.id}
            item={item}
            grade={grade}
            rotulo={rotulos[item.id] ?? item.id}
            unidade={unidade}
            coluna={coluna}
            bloco={blocos.includes(item.id)}
            solto={solto}
          >
            {conteudo(item.id)}
          </CardDaGrade>
        ))}
        {/* Onde o card arrastado vai cair: a moldura desliza de uma célula para outra. */}
        {fantasma && (
          <motion.div
            layout
            transition={MOLA_PREVIA}
            aria-hidden
            style={posicaoNaGrade(fantasma)}
            className="z-20 rounded-2xl bg-primary/10 ring-2 ring-primary/40"
          />
        )}
      </div>
    </DragDropProvider>
  );
}
