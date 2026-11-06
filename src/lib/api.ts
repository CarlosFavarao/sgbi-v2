import { queryOptions } from "@tanstack/react-query";
import type { Acesso } from "./acesso";
import { periodoComparacao } from "./date";
import type { FiliaisResponse, Filtros } from "./filtros";

/** GET em uma rota da API; erros viram `Error` com a mensagem do servidor. */
export async function getJson<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  const response = await fetch(`${path}${query}`);
  const body = await response.json().catch(() => null);
  // Sessão vencida (D45): volta ao login e, depois de entrar, para esta tela.
  if (response.status === 401 && typeof window !== "undefined") {
    const de = `${window.location.pathname}${window.location.search}`;
    // Fora de um componente (sem router) e com recarga completa, que descarta o cache da sessão vencida.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?de=${encodeURIComponent(de)}`);
  }
  if (!response.ok) throw new Error(body?.error ?? "Falha ao carregar os dados.");
  return body as T;
}

/** Filtros em parâmetros de URL (validados no servidor por `src/server/params.ts`). */
export function filtrosParams(filtros: Filtros) {
  const comparacao = periodoComparacao(filtros.periodo, filtros.comparacao);
  return {
    inicio: filtros.periodo.inicio,
    fim: filtros.periodo.fim,
    // O servidor recebe a comparação já resolvida em datas.
    comparacaoInicio: comparacao.inicio,
    comparacaoFim: comparacao.fim,
    filiais: [...filtros.filiais].sort((a, b) => a - b).join(","),
    origem: filtros.origem,
  };
}

// Dados D-1: não precisam ser recarregados durante o uso da tela.
export const STALE_TIME = 10 * 60_000;

/** Filiais com movimento e datas carregadas (compartilhado entre as telas). */
export const filiaisQuery = () =>
  queryOptions({
    queryKey: ["filiais"],
    queryFn: () => getJson<FiliaisResponse>("/api/filiais"),
    staleTime: Infinity,
  });

export type Sessao = { usuario: { login: string; nome: string; admin: boolean }; acesso: Acesso };

/** Usuário logado e o que ele pode ver (D45, D46). Vale até sair: a plataforma e as permissões vêm do login. */
export const sessaoQuery = () =>
  queryOptions({
    queryKey: ["sessao"],
    queryFn: () => getJson<Sessao>("/api/sessao"),
    staleTime: Infinity,
  });
