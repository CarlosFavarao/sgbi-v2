"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  alterarItemBloco,
  mostrar,
  normalizar,
  ocultar,
  ordenarBloco,
  posicionar,
  redimensionar,
  trocar,
  type Borda,
  type Layout,
  type Limites,
} from "@/lib/layout";
import { useTelaLarga } from "./tela-larga";

const chave = (tela: string) => `sgbi:layout:${tela}:v1`;

// Sem localStorage (navegação privada, bloqueio): o layout vale só até recarregar.
const memoria = new Map<string, string | null>();
const ouvintes = new Set<() => void>();

function lerBruto(tela: string): string | null {
  try {
    return localStorage.getItem(chave(tela));
  } catch {
    return memoria.get(tela) ?? null;
  }
}

function gravar(tela: string, layout: Layout | null) {
  const valor = layout ? JSON.stringify(layout) : null;
  try {
    if (valor) localStorage.setItem(chave(tela), valor);
    else localStorage.removeItem(chave(tela));
  } catch {
    memoria.set(tela, valor);
  }
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  // Outra aba mudou o layout.
  window.addEventListener("storage", avisar);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function interpretar(bruto: string | null): Partial<Layout> | null {
  try {
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

/**
 * Layout personalizável de uma tela (D43): estado, modo de edição e ações.
 * Fica salvo no navegador (`localStorage`); sem nada salvo, ou com algo
 * inválido, vale o `padrao`.
 */
export function useLayout(tela: string, padrao: Layout, limites: Limites) {
  // No servidor (e na hidratação) vale o padrão; depois, o que estiver salvo.
  const bruto = useSyncExternalStore(
    assinar,
    () => lerBruto(tela),
    () => null,
  );
  const layout = useMemo(() => normalizar(interpretar(bruto), padrao, limites), [bruto, padrao, limites]);
  const [editandoEstado, setEditando] = useState(false);
  // Abaixo de `xl` os cards ficam empilhados e não há edição.
  const larga = useTelaLarga();
  const editando = editandoEstado && larga;

  const atualizar = useCallback((f: (l: Layout) => Layout) => gravar(tela, f(layout)), [tela, layout]);

  // Esc encerra a edição (se nenhuma janela ou menu estiver aberto: eles tratam o Esc antes).
  useEffect(() => {
    if (!editando) return;
    const aoTeclar = (e: KeyboardEvent) => {
      // Janela, menu ou popover aberto: o Esc é dele.
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector('[role="dialog"][data-state="open"]'))
        return;
      setEditando(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [editando]);

  return useMemo(
    () => ({
      layout,
      padrao,
      limites,
      editando,
      larga,
      setEditando,
      redimensionar: (id: string, desejado: { x: number; y: number; w: number; h: number }, borda: Borda) =>
        atualizar((l) => redimensionar(l, id, desejado, borda, limites)),
      /** Grava um layout já calculado (ex.: o resultado do arraste, igual ao que a prévia mostrou). */
      substituir: (novo: Layout) => atualizar(() => novo),
      /** Troca dois cards de lugar (o que não couber vai para uma linha nova abaixo). */
      trocar: (idA: string, idB: string) => atualizar((l) => trocar(l, idA, idB, limites)),
      /** Move o card para a coluna `x` e a linha `y` (quem ficar por baixo desce). */
      posicionar: (id: string, x: number, y: number) => atualizar((l) => posicionar(l, id, x, y, limites)),
      ocultar: (id: string) => atualizar((l) => ocultar(l, id)),
      mostrar: (id: string) => atualizar((l) => mostrar(l, id)),
      alterarItemBloco: (bloco: string, id: string, mudanca: Parameters<typeof alterarItemBloco>[3]) =>
        atualizar((l) => alterarItemBloco(l, bloco, id, mudanca)),
      ordenarBloco: (bloco: string, ids: string[]) => atualizar((l) => ordenarBloco(l, bloco, ids)),
      restaurarPadrao: () => gravar(tela, null),
    }),
    [layout, limites, editando, larga, atualizar, padrao, tela],
  );
}

export type LayoutTela = ReturnType<typeof useLayout>;
