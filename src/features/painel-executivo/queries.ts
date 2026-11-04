import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { filiaisQuery, filtrosParams, getJson, STALE_TIME } from "@/lib/api";
import type {
  DepartamentosResponse,
  Filtros,
  MetaResponse,
  Fonte,
  Nivel,
  SerieResponse,
} from "./types";

const BASE = "/api/painel-executivo";
const get = <T,>(path: string, params?: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);
const toParams = filtrosParams;

export const painelQueries = {
  filiais: filiaisQuery,

  serie: (filtros: Filtros, fonte: Fonte) => {
    // Só "vendas" depende da origem: as outras fontes não recarregam ao trocá-la.
    const { origem, ...resto } = toParams(filtros);
    const params = fonte === "vendas" ? { ...resto, origem } : resto;
    return queryOptions({
      queryKey: ["painel-executivo", "serie", fonte, params],
      queryFn: () => get<SerieResponse>(`/series/${fonte}`, params),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: filtros.filiais.length > 0,
    });
  },

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
