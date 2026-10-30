"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Tamanho = {
  altura: number;
  esquerda: number;
  /** true = altura escolhida pelo usuário; false = acompanha a tela. */
  alturaManual: boolean;
};

const MIN_ALTURA = 220;
const MIN_ESQUERDA = 35;
const MAX_ESQUERDA = 80;
const PASSO_TECLADO = { altura: 24, esquerda: 2 };
/** Alça de altura (12px) + padding inferior da página (12px). */
const MARGEM_INFERIOR = 24;

function lerSalvo(chave: string): { altura?: number; esquerda?: number } {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? "{}");
  } catch {
    return {};
  }
}

function salvar(chave: string, t: Tamanho) {
  try {
    localStorage.setItem(chave, JSON.stringify({ esquerda: t.esquerda, ...(t.alturaManual && { altura: t.altura }) }));
  } catch {
    // Sem storage: o tamanho vale só até recarregar a página.
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Dois painéis lado a lado, redimensionáveis pelo usuário:
 * - alça vertical entre eles ajusta a largura (em % da linha);
 * - alça horizontal abaixo ajusta a altura dos dois.
 * Sem ajuste salvo, a altura ocupa o resto da tela (sem rolar a página).
 * Abaixo de `xl` os painéis empilham com altura fixa e sem alças.
 */
export function ResizableRow({
  storageKey,
  esquerda,
  direita,
  larguraInicial = 66,
}: {
  storageKey: string;
  esquerda: ReactNode;
  direita: ReactNode;
  /** % da largura para o painel da esquerda. */
  larguraInicial?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tamanho, setTamanho] = useState<Tamanho>({
    altura: 360,
    esquerda: larguraInicial,
    alturaManual: false,
  });

  const alturaPelaTela = useCallback(() => {
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    return Math.max(MIN_ALTURA, Math.round(window.innerHeight - top - window.scrollY - MARGEM_INFERIOR));
  }, []);

  // Lê o ajuste salvo antes da primeira pintura, para não "pular".
  useLayoutEffect(() => {
    const salvo = lerSalvo(storageKey);
    // Medição do DOM + storage do navegador: só existe no cliente, antes da pintura.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTamanho({
      altura: salvo.altura ?? alturaPelaTela(),
      esquerda: clamp(salvo.esquerda ?? larguraInicial, MIN_ESQUERDA, MAX_ESQUERDA),
      alturaManual: salvo.altura != null,
    });
  }, [storageKey, larguraInicial, alturaPelaTela]);

  // Sem ajuste do usuário, acompanha mudanças de tamanho da janela e do conteúdo acima.
  useEffect(() => {
    const atualizar = () => {
      const altura = alturaPelaTela();
      setTamanho((t) => (t.alturaManual || t.altura === altura ? t : { ...t, altura }));
    };
    const observer = new ResizeObserver(atualizar);
    observer.observe(document.body);
    window.addEventListener("resize", atualizar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, [alturaPelaTela]);

  const arrastar = (eixo: "x" | "y") => (inicio: React.PointerEvent) => {
    inicio.preventDefault();
    const linha = ref.current!.getBoundingClientRect();
    const base = tamanho;
    let atual = base;
    document.body.style.cursor = eixo === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    const mover = (e: PointerEvent) => {
      atual =
        eixo === "x"
          ? { ...base, esquerda: clamp(((e.clientX - linha.left) / linha.width) * 100, MIN_ESQUERDA, MAX_ESQUERDA) }
          : { ...base, altura: Math.max(MIN_ALTURA, Math.round(base.altura + e.clientY - inicio.clientY)), alturaManual: true };
      setTamanho(atual);
    };
    const soltar = () => {
      document.removeEventListener("pointermove", mover);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      salvar(storageKey, atual);
    };
    document.addEventListener("pointermove", mover);
    document.addEventListener("pointerup", soltar, { once: true });
  };

  const teclado = (eixo: "x" | "y") => (e: React.KeyboardEvent) => {
    const sinal = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!sinal) return;
    e.preventDefault();
    const t =
      eixo === "x"
        ? { ...tamanho, esquerda: clamp(tamanho.esquerda + sinal * PASSO_TECLADO.esquerda, MIN_ESQUERDA, MAX_ESQUERDA) }
        : { ...tamanho, altura: Math.max(MIN_ALTURA, tamanho.altura + sinal * PASSO_TECLADO.altura), alturaManual: true };
    setTamanho(t);
    salvar(storageKey, t);
  };

  // Duplo clique nas alças volta ao tamanho automático.
  const restaurar = () => {
    const t = { altura: alturaPelaTela(), esquerda: larguraInicial, alturaManual: false };
    setTamanho(t);
    salvar(storageKey, t);
  };

  const alca =
    "group flex items-center justify-center rounded-full outline-none focus-visible:bg-primary/20";
  const grip = "rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary";

  return (
    <div>
      <div
        ref={ref}
        className="flex flex-col gap-2.5 xl:grid xl:gap-0 xl:[grid-template-columns:var(--esquerda)_10px_1fr] xl:[height:var(--altura)]"
        style={{ "--esquerda": `${tamanho.esquerda}%`, "--altura": `${tamanho.altura}px` } as React.CSSProperties}
      >
        <div className="h-[28rem] min-h-0 min-w-0 xl:h-auto">{esquerda}</div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar largura dos painéis (duplo clique restaura)"
          aria-valuenow={Math.round(tamanho.esquerda)}
          aria-valuemin={MIN_ESQUERDA}
          aria-valuemax={MAX_ESQUERDA}
          tabIndex={0}
          onPointerDown={arrastar("x")}
          onKeyDown={teclado("x")}
          onDoubleClick={restaurar}
          className={`${alca} hidden cursor-col-resize xl:flex`}
        >
          <span className={`${grip} h-10 w-1`} />
        </div>
        <div className="h-96 min-h-0 min-w-0 xl:h-auto">{direita}</div>
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Ajustar altura dos painéis (duplo clique restaura)"
        aria-valuenow={tamanho.altura}
        aria-valuemin={MIN_ALTURA}
        tabIndex={0}
        onPointerDown={arrastar("y")}
        onKeyDown={teclado("y")}
        onDoubleClick={restaurar}
        className={`${alca} hidden h-3 cursor-row-resize xl:flex`}
      >
        <span className={`${grip} h-1 w-10`} />
      </div>
    </div>
  );
}
