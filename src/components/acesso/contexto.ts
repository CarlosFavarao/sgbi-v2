"use client";

import { createContext, use } from "react";
import { bloqueio, temFontes, type Acesso, type Bloqueio, type Fonte, type Tela } from "@/lib/acesso";

export const ContextoAcesso = createContext<{ acesso: Acesso; tela: Tela } | null>(null);

/**
 * Acesso do usuário na tela atual (D46), dentro do `PortaoDaTela`. As chaves
 * são relativas à tela (`card` ou `bloco:item`).
 */
export function useAcesso() {
  const contexto = use(ContextoAcesso);
  if (!contexto) throw new Error("useAcesso precisa estar dentro de <PortaoDaTela>.");
  const { acesso, tela } = contexto;
  return {
    acesso,
    tela,
    /** Por que o card (ou item de bloco) está desabilitado, ou `null`. */
    bloqueio: (chave: string, fontes: readonly Fonte[] = []): Bloqueio | null =>
      bloqueio(acesso, `${tela}:${chave}`, fontes),
    /** A plataforma tem estas fontes? */
    temFontes: (fontes: readonly Fonte[]) => temFontes(acesso, fontes),
    /**
     * Opções de consulta (React Query) desligadas quando a plataforma não tem as
     * fontes: não busca o que não existe (a rota responderia 403).
     */
    seHouver: <T extends { enabled?: unknown }>(opcoes: T, fontes: readonly Fonte[]): T => ({
      ...opcoes,
      enabled: opcoes.enabled !== false && temFontes(acesso, fontes),
    }),
  };
}
