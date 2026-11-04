"use client";

import Icon from "@mdi/react";
import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import { createContext, use, useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

/** Aviso exibido no botão de avisos da barra lateral (em vez de faixas no topo da tela). */
export type Aviso = {
  id: string;
  nivel: "atencao" | "erro";
  titulo: string;
  detalhes?: string[];
  acao?: { label: string; onClick: () => void };
};

type AvisosContexto = {
  avisos: Aviso[];
  definir: (origem: string, avisos: Aviso[]) => void;
};

const Contexto = createContext<AvisosContexto | null>(null);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [porOrigem, setPorOrigem] = useState<Record<string, Aviso[]>>({});
  const definir = useCallback((origem: string, avisos: Aviso[]) => {
    setPorOrigem((atual) => {
      if (!avisos.length && !atual[origem]) return atual;
      const proximo = { ...atual };
      if (avisos.length) proximo[origem] = avisos;
      else delete proximo[origem];
      return proximo;
    });
  }, []);
  const valor = useMemo(() => ({ avisos: Object.values(porOrigem).flat(), definir }), [porOrigem, definir]);
  return <Contexto value={valor}>{children}</Contexto>;
}

/**
 * Registra os avisos de uma tela (`origem`). Só reenvia quando o conteúdo muda,
 * então funções em `acao` podem ser recriadas a cada render.
 */
export function useAvisos(origem: string, avisos: Aviso[]) {
  // `definir` é estável; o objeto do contexto muda a cada aviso registrado e não pode
  // ser dependência da limpeza (ela apagaria o aviso logo depois de registrá-lo).
  const definir = use(Contexto)?.definir;
  const chave = JSON.stringify(avisos.map((a) => [a.id, a.nivel, a.titulo, a.detalhes, a.acao?.label]));
  const registrar = useEffectEvent(() => definir?.(origem, avisos));

  useEffect(() => {
    registrar();
  }, [chave]);

  useEffect(() => () => definir?.(origem, []), [definir, origem]);
}

const ESTILO = {
  atencao: { icone: mdiAlertOutline, cor: "text-warning", fundo: "bg-summary-orange-bg" },
  erro: { icone: mdiAlertCircleOutline, cor: "text-error", fundo: "bg-negative-highlight" },
} as const;

/**
 * Triângulo de aviso com contador. Abre um popup não modal ao lado (a tela
 * continua utilizável; fecha com clique fora ou Esc). Some quando não há avisos.
 */
export function AvisosBotao({
  expandido = false,
  lado = "right",
}: {
  /** Barra lateral expandida: mostra o rótulo ao lado do ícone. */
  expandido?: boolean;
  lado?: "right" | "bottom";
}) {
  const contexto = use(Contexto);
  const avisos = contexto?.avisos ?? [];
  if (!avisos.length) return null;

  const temErro = avisos.some((a) => a.nivel === "erro");
  const rotulo = `${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}`;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Ver ${rotulo}`}
        title={rotulo}
        className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-[9px] text-sm font-medium outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white data-[state=open]:bg-white/20 ${
          lado === "bottom" ? "w-9 justify-center px-0" : ""
        }`}
      >
        <span className="relative shrink-0">
          <Icon path={temErro ? mdiAlertCircleOutline : mdiAlertOutline} size={0.85} aria-hidden />
          <span
            className={`absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-header ${
              temErro ? "bg-error" : "bg-warning"
            }`}
          >
            {avisos.length}
          </span>
        </span>
        {lado === "right" && (
          <span
            className={`whitespace-nowrap transition-opacity duration-150 ${expandido ? "opacity-100" : "opacity-0"}`}
          >
            Avisos
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent side={lado} align={lado === "right" ? "end" : "start"} sideOffset={10} className="w-80 p-2">
        <div className="px-1.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</div>
        <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
          {avisos.map((aviso) => {
            const estilo = ESTILO[aviso.nivel];
            return (
              <li key={aviso.id} className="flex gap-2.5 rounded-lg border p-2.5">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${estilo.fundo} ${estilo.cor}`}>
                  <Icon path={estilo.icone} size={0.7} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-snug">{aviso.titulo}</div>
                  {aviso.detalhes?.map((d) => (
                    <p key={d} className="mt-0.5 text-xs text-muted-foreground">
                      {d}
                    </p>
                  ))}
                  {aviso.acao && (
                    <button
                      type="button"
                      onClick={aviso.acao.onClick}
                      className="mt-2 h-7 rounded-md border px-2.5 text-xs font-medium hover:bg-secondary"
                    >
                      {aviso.acao.label}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
