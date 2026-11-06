"use client";

import Icon from "@mdi/react";
import { mdiDrag, mdiEyeOffOutline } from "@mdi/js";
import { Feedback } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import { motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  alturaDaLinha,
  alturaTotal,
  COLUNAS,
  encaixe,
  espacosLivres,
  faixaDeRedimensionamento,
  limitesDe,
  trocaVisual,
  type Borda,
  type ItemLayout,
  type LinhaLayout,
} from "@/lib/layout";
import { AlcaBorda, pararArraste } from "./alca-borda";
import { animarDesde, animarSaida, MOLA, MOLA_PREVIA } from "./movimento";
import { NOVA_LINHA, type LayoutTela } from "./use-layout";

/** Espaço entre cards e entre linhas (gap-2.5). */
export const GAP = 10;
/** Altura mínima de uma unidade de linha (px): em telas baixas a página rola. */
const UNIDADE_MINIMA = 30;
/** Unidade fixa abaixo de `xl` (cards empilhados). */
const UNIDADE_EMPILHADA = 40;
/** Padding inferior da página. */
const MARGEM_INFERIOR = 12;
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
 * O que acontece ao soltar o card arrastado: cair numa linha (`null` = linha
 * nova) e colunas, ou trocar de lugar com o card que está sob o ponteiro.
 */
export type Previa =
  | { tipo: "posicao"; id: string; linha: string | null; x: number; w: number; h: number }
  | { tipo: "troca"; id: string; com: string };

/** Card que acabou de ser solto e a caixa (na tela) de onde ele parte. */
type Solto = { id: string; de: DOMRect };

/** Tamanho ao vivo durante o redimensionamento: o card segue o ponteiro em px. */
type AoVivo = { largura: number; altura: number; ancoraDireita: boolean };

function CardDaGrade({
  item,
  linha,
  grade,
  rotulo,
  unidade,
  coluna,
  bloco,
  solto,
  children,
}: {
  item: ItemLayout;
  linha: LinhaLayout;
  grade: LayoutTela;
  rotulo: string;
  unidade: number;
  coluna: number;
  /** Card com itens editáveis dentro (ex.: KPIs): o conteúdo continua interativo na edição. */
  bloco: boolean;
  solto: Solto | null;
  children: ReactNode;
}) {
  const { editando, layout, limites } = grade;
  const travar = editando && !bloco;
  const { ref, handleRef, isDragging } = useDraggable({
    id: item.id,
    type: "card",
    data: { linha: linha.id },
    disabled: !editando,
  });
  const elRef = useRef<HTMLDivElement | null>(null);
  const inicio = useRef<{ x: number; w: number; h: number; ret: DOMRect } | null>(null);
  const [aoVivo, setAoVivo] = useState<AoVivo | null>(null);
  const acabouDeCair = solto?.id === item.id;
  const animarLayout = !isDragging && !acabouDeCair;

  // O card solto sai de onde foi largado e desliza (mola) até o lugar novo.
  useLayoutEffect(() => {
    if (acabouDeCair && elRef.current && solto) animarDesde(elRef.current, solto.de);
  }, [acabouDeCair, solto]);

  const lim = limitesDe(limites, item.id);
  const passo = { x: coluna + GAP, y: unidade + GAP };
  const larguraPx = item.w * coluna + (item.w - 1) * GAP;
  const alturaCard = alturaPx(item.h, unidade);

  const iniciar = (borda: Borda) => {
    const ret = elRef.current!.getBoundingClientRect();
    inicio.current = { x: item.x, w: item.w, h: item.h, ret };
    setAoVivo({ largura: ret.width, altura: ret.height, ancoraDireita: borda.includes("l") });
  };

  /** Novo tamanho a partir do deslocamento da borda, em colunas e linhas. */
  const aplicar = (borda: Borda, colunas: number, linhas: number, base: { x: number; w: number; h: number }) => {
    const x = borda.includes("l") ? base.x + colunas : base.x;
    const w = borda.includes("l") ? base.w - colunas : borda.includes("r") ? base.w + colunas : base.w;
    // A linha não sobe: puxar a borda de cima para cima também aumenta a altura (o card cresce para baixo).
    const h = borda.includes("t") ? base.h - linhas : borda.includes("b") ? base.h + linhas : base.h;
    if (x !== item.x || w !== item.w || h !== item.h) grade.redimensionar(item.id, { x, w, h }, borda);
  };

  // O card acompanha o ponteiro em px (dentro dos limites); a grade encaixa na coluna/linha mais próxima.
  const mover = (borda: Borda) => (dx: number, dy: number) => {
    const i = inicio.current;
    const faixa = faixaDeRedimensionamento(layout, item.id, limites);
    if (!i || !faixa) return;
    const origemLinha = i.ret.left - i.x * passo.x;
    const larguraMin = lim.min.w * coluna + (lim.min.w - 1) * GAP;
    let largura = i.ret.width;
    if (borda.includes("l")) {
      const esq = Math.min(Math.max(i.ret.left + dx, origemLinha + faixa.esquerda * passo.x), i.ret.right - larguraMin);
      largura = i.ret.right - esq;
    } else if (borda.includes("r")) {
      const dir = Math.max(
        Math.min(i.ret.right + dx, origemLinha + faixa.direita * passo.x - GAP),
        i.ret.left + larguraMin,
      );
      largura = dir - i.ret.left;
    }
    const dh = borda.includes("t") ? -dy : borda.includes("b") ? dy : 0;
    const altura = Math.min(Math.max(i.ret.height + dh, alturaPx(lim.min.h, unidade)), alturaPx(lim.max.h, unidade));
    setAoVivo({ largura, altura, ancoraDireita: borda.includes("l") });
    aplicar(borda, Math.round(dx / passo.x), Math.round(dy / passo.y), i);
  };

  const soltar = () => {
    inicio.current = null;
    setAoVivo(null);
  };

  return (
    <motion.div
      ref={(el: HTMLDivElement | null) => {
        ref(el);
        elRef.current = el;
      }}
      // Posição e tamanho animam com mola (Motion). O card arrastado é movido pelo dnd-kit e o recém-solto
      // anima à parte (`animarDesde`): os dois ficam fora da animação de layout.
      layout={animarLayout}
      layoutId={animarLayout ? `card-${item.id}` : undefined}
      transition={MOLA}
      data-card={item.id}
      style={{ gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: 1, height: alturaCard }}
      className={`relative min-w-0 ${isDragging ? "z-40" : aoVivo ? "z-30" : ""}`}
    >
      {/* Durante o redimensionamento: onde o card vai encaixar. */}
      {aoVivo && <div aria-hidden className="absolute inset-0 rounded-2xl bg-primary/[0.06] ring-1 ring-primary/25" />}
      <motion.div
        layout={animarLayout}
        transition={MOLA}
        style={
          aoVivo
            ? {
                position: "absolute",
                top: 0,
                width: aoVivo.largura,
                height: aoVivo.altura,
                ...(aoVivo.ancoraDireita ? { right: 0 } : { left: 0 }),
              }
            : undefined
        }
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
                aoSoltar={soltar}
                aoTeclar={(dx, dy) => aplicar(borda, dx, dy, item)}
                noTeclado={borda.length === 1}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Linha({
  linha,
  grade,
  cards,
  rotulos,
  unidade,
  coluna,
  blocos,
  previa,
  solto,
}: {
  linha: LinhaLayout;
  grade: LayoutTela;
  blocos: string[];
  cards: Record<string, ReactNode>;
  rotulos: Record<string, string>;
  unidade: number;
  coluna: number;
  previa: Previa | null;
  solto: Solto | null;
}) {
  const { editando } = grade;
  const { ref } = useDroppable({ id: linha.id, type: "linha", accept: "card", disabled: !editando });
  const visiveis = linha.itens.filter((i) => i.visivel);
  if (!visiveis.length && !editando) return null;
  const altura = alturaPx(Math.max(alturaDaLinha(linha), 2), unidade);
  const aqui = previa?.tipo === "posicao" && previa.linha === linha.id ? previa : null;

  return (
    <div ref={ref} data-linha={linha.id} className="grid grid-cols-12 items-start gap-2.5">
      {/* Espaços vazios da linha: só aparecem na edição (o usuário decide se preenche). */}
      {editando &&
        espacosLivres(linha).map((t) => (
          <div
            key={`livre-${t.inicio}`}
            aria-hidden
            style={{ gridColumn: `${t.inicio + 1} / ${t.fim + 1}`, gridRow: 1, height: altura }}
            className="flex items-center justify-center rounded-2xl bg-secondary/40 text-xs text-muted-foreground/80 ring-1 ring-border/60 dark:bg-secondary/20"
          >
            {t.fim - t.inicio} {t.fim - t.inicio === 1 ? "coluna livre" : "colunas livres"}
          </div>
        ))}
      {visiveis.map((item) => (
        <CardDaGrade
          key={item.id}
          item={item}
          linha={linha}
          grade={grade}
          rotulo={rotulos[item.id] ?? item.id}
          unidade={unidade}
          coluna={coluna}
          bloco={blocos.includes(item.id)}
          solto={solto}
        >
          {cards[item.id]}
        </CardDaGrade>
      ))}
      {/* Onde o card arrastado vai cair: a moldura desliza de um lugar para outro. */}
      {aqui && (
        <motion.div
          layoutId="previa-posicao"
          transition={MOLA_PREVIA}
          aria-hidden
          style={{ gridColumn: `${aqui.x + 1} / span ${aqui.w}`, gridRow: 1, height: alturaPx(aqui.h, unidade) }}
          className="z-20 rounded-2xl bg-primary/10 ring-2 ring-primary/40"
        />
      )}
    </div>
  );
}

function NovaLinha({ editando, ativa }: { editando: boolean; ativa: boolean }) {
  const { ref } = useDroppable({ id: NOVA_LINHA, type: "linha", accept: "card", disabled: !editando });
  if (!editando) return null;
  return (
    <div
      ref={ref}
      className={`flex h-14 items-center justify-center rounded-2xl text-xs ring-1 transition-colors duration-200 ${
        ativa ? "bg-primary/10 text-primary ring-primary/40" : "bg-secondary/30 text-muted-foreground ring-border/60"
      }`}
    >
      Solte um card aqui para criar uma linha
    </div>
  );
}

type Operacao = {
  source: { id: string | number; type?: unknown } | null;
  target: { id: string | number } | null;
  position: { current: { x: number; y: number } };
};

/**
 * Grade personalizável da tela (D43): linhas de 12 colunas; cada card tem coluna
 * de início e largura, e espaços vazios são permitidos em qualquer ponto. No
 * modo de edição (`BarraEdicao`) os cards são arrastados por qualquer ponto
 * (dnd-kit), redimensionados pelas quatro bordas e cantos e ocultados. Soltar
 * sobre outro card troca os dois de lugar (o outro já desliza durante o
 * arraste); soltar num espaço vazio posiciona o card ali. Animações com Motion.
 * Abaixo de `xl` os cards empilham, na ordem, sem edição.
 */
export function GradePersonalizavel({
  grade,
  cards,
  rotulos,
  blocos = [],
}: {
  grade: LayoutTela;
  /** Cards com itens editáveis dentro (ex.: `kpis`, com `BlocoKpis`). */
  blocos?: string[];
  /** Conteúdo de cada card, por id. */
  cards: Record<string, ReactNode>;
  /** Nome de cada card (alça de arrastar, lista de ocultos). */
  rotulos: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const larga = grade.larga;
  const unidade = useUnidade(ref, alturaTotal(grade.padrao));
  const coluna = useColuna(ref);
  const { layout } = grade;
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [solto, setSolto] = useState<Solto | null>(null);
  // Distância do ponteiro até o canto do card no início do arraste (o card cai alinhado ao que se vê).
  const pegada = useRef({ x: 0, y: 0 });
  // Caixas dos cards no início do arraste (coordenadas da página): a troca usa estas, e não as da tela,
  // porque o outro card já desliza para o lugar novo durante o arraste.
  const caixas = useRef(new Map<string, { esquerda: number; topo: number; direita: number; base: number }>());

  // Durante a troca, o outro card já aparece no lugar novo.
  const exibido = useMemo(
    () => (previa?.tipo === "troca" ? trocaVisual(layout, previa.id, previa.com) : layout),
    [layout, previa],
  );

  const calcularPrevia = ({ source, target, position }: Operacao): Previa | null => {
    if (source?.type !== "card") return null;
    const id = String(source.id);
    const atual = layout.linhas.flatMap((l) => l.itens).find((i) => i.id === id);
    if (!atual) return null;
    const px = position.current.x + window.scrollX;
    const py = position.current.y + window.scrollY;
    for (const [outro, c] of caixas.current) {
      if (outro !== id && px >= c.esquerda && px <= c.direita && py >= c.topo && py <= c.base) {
        return { tipo: "troca", id, com: outro };
      }
    }
    if (!target) return null;
    if (target.id === NOVA_LINHA) return { tipo: "posicao", id, linha: null, x: 0, w: atual.w, h: atual.h };
    const el = ref.current?.querySelector<HTMLElement>(`[data-linha="${String(target.id)}"]`);
    if (!el) return null;
    const esquerda = position.current.x - pegada.current.x - el.getBoundingClientRect().left;
    const lugar = encaixe(layout, String(target.id), id, Math.round(esquerda / (coluna + GAP)), grade.limites);
    return lugar ? { tipo: "posicao", id, linha: String(target.id), ...lugar, h: atual.h } : null;
  };

  const atualizarPrevia = (operacao: Operacao) => {
    const nova = calcularPrevia(operacao);
    setPrevia((p) => (JSON.stringify(p) === JSON.stringify(nova) ? p : nova));
  };

  if (!larga) {
    return (
      <div ref={ref} className="flex flex-col gap-2.5">
        {layout.linhas.flatMap((l) =>
          l.itens
            .filter((i) => i.visivel)
            .map((i) => (
              // Blocos (KPIs) ficam com a altura do conteúdo; os outros cards, com altura fixa.
              <div
                key={i.id}
                style={blocos.includes(i.id) ? undefined : { height: alturaPx(i.h, UNIDADE_EMPILHADA) }}
                className={blocos.includes(i.id) ? "" : "*:h-full"}
              >
                {cards[i.id]}
              </div>
            )),
        )}
      </div>
    );
  }

  return (
    <DragDropProvider
      // Sem a animação de volta do dnd-kit: o card solto desliza (Motion) até o lugar novo.
      plugins={(padrao) => [...padrao, Feedback.configure({ dropAnimation: null })]}
      onDragStart={(event) => {
        const { source, position } = event.operation;
        const ret = source?.element?.getBoundingClientRect();
        if (ret) pegada.current = { x: position.current.x - ret.left, y: position.current.y - ret.top };
        caixas.current = new Map();
        ref.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
          const r = el.getBoundingClientRect();
          caixas.current.set(el.dataset.card!, {
            esquerda: r.left + window.scrollX,
            topo: r.top + window.scrollY,
            direita: r.right + window.scrollX,
            base: r.bottom + window.scrollY,
          });
        });
      }}
      // O alvo (linha) só muda no `dragover`, depois do `dragmove`: a prévia é calculada nos dois.
      onDragMove={(event) => atualizarPrevia(event.operation)}
      onDragOver={(event) => atualizarPrevia(event.operation)}
      onDragEnd={(event) => {
        const { source } = event.operation;
        // Recalcula com o alvo final (o estado da prévia pode estar um evento atrás).
        const destino = event.canceled ? null : calcularPrevia(event.operation);
        setPrevia(null);
        if (!source) return;
        if (source.type === "card") {
          const de = source.element?.getBoundingClientRect();
          if (destino && de) {
            setSolto({ id: String(source.id), de });
            window.setTimeout(() => setSolto(null), DURACAO_SOLTO);
          }
          if (destino?.tipo === "troca") grade.trocar(destino.id, destino.com);
          else if (destino) grade.posicionar(destino.id, destino.linha, destino.x);
        } else if (!event.canceled && source.type === "item-bloco") {
          const bloco = String((source.data as { bloco?: string }).bloco);
          const ids = (layout.blocos[bloco] ?? []).filter((i) => i.visivel).map((i) => i.id);
          grade.ordenarBloco(bloco, move(ids, event));
        }
      }}
    >
      <div ref={ref} className="flex flex-col gap-2.5">
        {exibido.linhas.map((linha) => (
          <Linha
            key={linha.id}
            linha={linha}
            grade={grade}
            cards={cards}
            rotulos={rotulos}
            unidade={unidade}
            coluna={coluna}
            blocos={blocos}
            previa={previa}
            solto={solto}
          />
        ))}
        <NovaLinha editando={grade.editando} ativa={previa?.tipo === "posicao" && previa.linha === null} />
      </div>
    </DragDropProvider>
  );
}
