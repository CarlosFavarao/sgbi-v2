"use client";

import { animate } from "motion/react";

/**
 * Molas da grade personalizável (Motion): sem quique (tela de negócio) e
 * longas o bastante para se ver o card chegando ao lugar novo.
 */
export const MOLA = { type: "spring", bounce: 0.1, visualDuration: 0.55 } as const;
/** Prévias (moldura de onde o card cai): acompanham o ponteiro mais de perto. */
export const MOLA_PREVIA = { type: "spring", bounce: 0, visualDuration: 0.3 } as const;
/** Transição das listas ordenáveis do dnd-kit (KPIs), no mesmo ritmo. */
export const TRANSICAO_ORDENAR = { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" } as const;

const reduzirMovimento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Some o elemento (esmaece e encolhe um pouco) e só então executa `depois` (ex.: ocultar o card). */
export function animarSaida(el: HTMLElement | null, depois: () => void) {
  if (!el || reduzirMovimento()) return depois();
  void animate(el, { opacity: 0, scale: 0.96 }, { duration: 0.28, ease: [0.4, 0, 1, 1] }).then(depois);
}

/**
 * Leva o elemento da caixa onde estava (ex.: onde o card foi solto) até a
 * posição atual, com mola. Usado no card solto, que o dnd-kit tirou do fluxo.
 */
export function animarDesde(el: HTMLElement, de: DOMRect) {
  if (reduzirMovimento()) return;
  const para = el.getBoundingClientRect();
  const dx = de.left - para.left;
  const dy = de.top - para.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  void animate(el, { x: [dx, 0], y: [dy, 0] }, MOLA);
}
