import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
  DepartamentosResponse,
  FiliaisResponse,
  Filtros,
  MetaResponse,
  Nivel,
  ResumoResponse,
} from "./types";

const BASE = "/api/painel-executivo";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  const response = await fetch(`${BASE}${path}${query}`);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Falha ao carregar os dados.");
  return body as T;
}

function toParams(filtros: Filtros) {
  return {
    inicio: filtros.periodo.inicio,
    fim: filtros.periodo.fim,
    comparacao: filtros.comparacao,
    filiais: [...filtros.filiais].sort((a, b) => a - b).join(","),
    origem: filtros.origem,
  };
}

// Dados D-1: não precisam ser recarregados durante o uso da tela.
const STALE_TIME = 10 * 60_000;

export const painelQueries = {
  filiais: () =>
    queryOptions({
      queryKey: ["painel-executivo", "filiais"],
      queryFn: () => get<FiliaisResponse>("/filiais"),
      staleTime: Infinity,
    }),

  resumo: (filtros: Filtros) =>
    queryOptions({
      queryKey: ["painel-executivo", "resumo", toParams(filtros)],
      queryFn: () => get<ResumoResponse>("/resumo", toParams(filtros)),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: filtros.filiais.length > 0,
    }),

  meta: (filtros: Filtros) => {
    // A meta não depende do período de comparação.
    const { inicio, fim, filiais, origem } = toParams(filtros);
    const params = { inicio, fim, filiais, origem };
    return queryOptions({
      queryKey: ["painel-executivo", "meta", params],
      queryFn: () => get<MetaResponse>("/meta", params),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: filtros.filiais.length > 0,
    });
  },

  departamentos: (filtros: Filtros, nivel: Nivel) =>
    queryOptions({
      queryKey: ["painel-executivo", "departamentos", nivel, toParams(filtros)],
      queryFn: () => get<DepartamentosResponse>("/departamentos", { ...toParams(filtros), nivel }),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: filtros.filiais.length > 0,
    }),
};
