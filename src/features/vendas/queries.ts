import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { filiaisQuery, filtrosParams, getJson, STALE_TIME } from "@/lib/api";
import type {
  CuponsNivelResponse,
  Filtros,
  FonteVendas,
  Nivel,
  NiveisResponse,
  ProdutosResponse,
  SerieVendasResponse,
} from "./types";

const BASE = "/api/vendas";
const get = <T,>(path: string, params: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);

/** Os cupons vêm do PDV: a Origem não muda o resultado nem a chave de cache. */
function semOrigem(filtros: Filtros) {
  const params: Partial<ReturnType<typeof filtrosParams>> = filtrosParams(filtros);
  delete params.origem;
  return params as Omit<ReturnType<typeof filtrosParams>, "origem">;
}

const comum = (filtros: Filtros) => ({
  staleTime: STALE_TIME,
  placeholderData: keepPreviousData,
  enabled: filtros.filiais.length > 0,
});

export const vendasQueries = {
  filiais: filiaisQuery,

  serie: (filtros: Filtros, fonte: FonteVendas) => {
    const params = fonte === "vendas" ? filtrosParams(filtros) : semOrigem(filtros);
    return queryOptions({
      queryKey: ["vendas", "serie", fonte, params],
      queryFn: () => get<SerieVendasResponse>(`/series/${fonte}`, params),
      ...comum(filtros),
    });
  },

  niveis: (filtros: Filtros, nivel: Nivel) => {
    const params = { ...filtrosParams(filtros), nivel };
    return queryOptions({
      queryKey: ["vendas", "niveis", params],
      queryFn: () => get<NiveisResponse>("/niveis", params),
      ...comum(filtros),
    });
  },

  cuponsNiveis: (filtros: Filtros, nivel: Nivel) => {
    const params = { ...semOrigem(filtros), nivel };
    return queryOptions({
      queryKey: ["vendas", "cupons-niveis", params],
      queryFn: () => get<CuponsNivelResponse>("/niveis/cupons", params),
      ...comum(filtros),
    });
  },

  produtos: (filtros: Filtros) => {
    const params = filtrosParams(filtros);
    return queryOptions({
      queryKey: ["vendas", "produtos", params],
      queryFn: () => get<ProdutosResponse>("/produtos", params),
      ...comum(filtros),
    });
  },
};
