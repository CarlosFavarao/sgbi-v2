"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Borda } from "@/lib/layout";

const CURSOR: Record<Borda, string> = {
  l: "ew-resize",
  r: "ew-resize",
  t: "ns-resize",
  b: "ns-resize",
  tl: "nwse-resize",
  br: "nwse-resize",
  tr: "nesw-resize",
  bl: "nesw-resize",
};

// Faixas por toda a borda (fáceis de pegar mesmo em cards pequenos), um pouco para fora do card.
const POSICAO: Record<Borda, string> = {
  l: "inset-y-3 -left-1.5 w-3",
  r: "inset-y-3 -right-1.5 w-3",
  t: "inset-x-3 -top-1.5 h-3",
  b: "inset-x-3 -bottom-1.5 h-3",
  tl: "-left-2 -top-2 size-4",
  tr: "-right-2 -top-2 size-4",
  bl: "-bottom-2 -left-2 size-4",
  br: "-bottom-2 -right-2 size-4",
};

const MARCA: Record<Borda, string> = {
  l: "h-8 max-h-[60%] w-1",
  r: "h-8 max-h-[60%] w-1",
  t: "h-1 w-8 max-w-[60%]",
  b: "h-1 w-8 max-w-[60%]",
  tl: "size-2.5",
  tr: "size-2.5",
  bl: "size-2.5",
  br: "size-2.5",
};

/**
 * Alça de redimensionar numa borda ou canto do card: arrastar chama `aoMover`
 * com o deslocamento do ponteiro (px) desde o início; o card decide o encaixe.
 * Pelo teclado, as setas chamam `aoTeclar` com a direção (−1, 0 ou +1 por eixo),
 * como se o ponteiro andasse uma coluna ou linha.
 */
export function AlcaBorda({
  borda,
  rotulo,
  aoIniciar,
  aoMover,
  aoSoltar,
  aoTeclar,
  noTeclado = true,
}: {
  borda: Borda;
  rotulo: string;
  aoIniciar?: () => void;
  aoMover: (dx: number, dy: number) => void;
  aoSoltar?: () => void;
  aoTeclar: (dx: number, dy: number) => void;
  /** Cantos ficam fora da ordem do Tab (as bordas já cobrem o teclado). */
  noTeclado?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // As funções mais recentes, lidas no momento do arraste.
  const acoes = useRef({ aoIniciar, aoMover, aoSoltar });
  useEffect(() => {
    acoes.current = { aoIniciar, aoMover, aoSoltar };
  });

  // Listener nativo no próprio botão: o card inteiro é alça de arrastar (dnd-kit escuta o pointerdown
  // nele), e o stopPropagation do React chegaria tarde demais.
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    const iniciar = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const { clientX: x0, clientY: y0 } = e;
      acoes.current.aoIniciar?.();
      const mover = (ev: PointerEvent) => acoes.current.aoMover(ev.clientX - x0, ev.clientY - y0);
      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
        document.body.style.removeProperty("cursor");
        acoes.current.aoSoltar?.();
      };
      document.body.style.cursor = CURSOR[borda];
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    };
    alvo.addEventListener("pointerdown", iniciar);
    return () => alvo.removeEventListener("pointerdown", iniciar);
  }, [borda]);

  const teclar = (e: KeyboardEvent) => {
    const horizontal = borda.includes("l") || borda.includes("r");
    const vertical = borda.includes("t") || borda.includes("b");
    const dx = horizontal ? (({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[e.key] ?? 0) : 0;
    const dy = vertical ? (({ ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[e.key] ?? 0) : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    e.stopPropagation();
    aoTeclar(dx, dy);
  };

  return (
    <button
      type="button"
      aria-label={rotulo}
      ref={ref}
      tabIndex={noTeclado ? 0 : -1}
      onKeyDown={teclar}
      style={{ cursor: CURSOR[borda] }}
      className={`group/alca absolute z-20 flex touch-none items-center justify-center rounded-full outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring ${POSICAO[borda]}`}
    >
      <span
        className={`rounded-full bg-primary/45 shadow-sm transition-[transform,background-color] duration-200 group-hover/alca:scale-125 group-hover/alca:bg-primary ${MARCA[borda]}`}
      />
    </button>
  );
}

/** Impede que clicar num controle dentro da alça (o card inteiro) comece um arraste (listener nativo). */
export function pararArraste(el: HTMLElement | null) {
  if (!el) return;
  const parar = (e: Event) => e.stopPropagation();
  el.addEventListener("pointerdown", parar);
  return () => el.removeEventListener("pointerdown", parar);
}
