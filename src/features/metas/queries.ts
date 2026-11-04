import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { filiaisQuery, getJson, STALE_TIME } from "@/lib/api";
import type {
  FiltrosMetas,
  MetasDiariasResponse,
  Nivel,
  NiveisMetasResponse,
  OpcoesMetasResponse,
  PeriodoMeta,
  Periodo,
  RealizadoDiarioResponse,
  TotalResponse,
} from "./types";

const BASE = "/api/metas";
const get = <T,>(path: string, params: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);

const filiaisParam = (filtros: FiltrosMetas) => [...filtros.filiais].sort((a, b) => a - b).join(",");

/** Filiais e departamento (sem origem: as metas não dependem dela). */
function base(filtros: FiltrosMetas): Record<string, string> {
  return {
    filiais: filiaisParam(filtros),
    ...(filtros.departamento != null && { departamento: String(filtros.departamento) }),
  };
}

const periodo = (p: Periodo | null, prefixo = ""): Record<string, string> =>
  !p ? {} : prefixo ? { [`${prefixo}Inicio`]: p.inicio, [`${prefixo}Fim`]: p.fim } : { inicio: p.inicio, fim: p.fim };

const comum = (filtros: FiltrosMetas) => ({
  staleTime: STALE_TIME,
  placeholderData: keepPreviousData,
  enabled: filtros.filiais.length > 0,
});

export const metasQueries = {
  filiais: filiaisQuery,

  opcoes: (filiais: number[]) => {
    const params = { filiais: [...filiais].sort((a, b) => a - b).join(",") };
    return queryOptions({
      queryKey: ["metas", "opcoes", params],
      queryFn: () => get<OpcoesMetasResponse>("/opcoes", params),
      staleTime: STALE_TIME,
      enabled: filiais.length > 0,
    });
  },

  /** Meta diária (loja ou departamento filtrado) num intervalo. */
  metasDiarias: (filtros: FiltrosMetas, intervalo: Periodo | null) => {
    const params = { ...base(filtros), ...periodo(intervalo) };
    return queryOptions({
      queryKey: ["metas", "metas-diarias", params],
      queryFn: () => get<MetasDiariasResponse>("/metas-diarias", params),
      ...comum(filtros),
      enabled: filtros.filiais.length > 0 && !!intervalo,
    });
  },

  realizadoDiario: (filtros: FiltrosMetas, intervalo: Periodo | null) => {
    const params = { ...base(filtros), origem: filtros.origem, ...periodo(intervalo) };
    return queryOptions({
      queryKey: ["metas", "realizado-diario", params],
      queryFn: () => get<RealizadoDiarioResponse>("/realizado-diario", params),
      ...comum(filtros),
      enabled: filtros.filiais.length > 0 && !!intervalo,
    });
  },

  total: (filtros: FiltrosMetas, intervalo: Periodo | null) => {
    const params = { ...base(filtros), origem: filtros.origem, ...periodo(intervalo) };
    return queryOptions({
      queryKey: ["metas", "total", params],
      queryFn: () => get<TotalResponse>("/total", params),
      ...comum(filtros),
      enabled: filtros.filiais.length > 0 && !!intervalo,
    });
  },

  /** `aba` ausente (datas ainda carregando): a consulta fica desligada. */
  niveis: (filtros: FiltrosMetas, nivel: Nivel, aba: PeriodoMeta | undefined) => {
    const params = {
      ...base(filtros),
      origem: filtros.origem,
      nivel,
      ...periodo(aba?.periodo ?? null),
      ...periodo(aba?.decorrido ?? null, "decorrido"),
      ...periodo(aba?.comparacao ?? null, "comparacao"),
    };
    return queryOptions({
      queryKey: ["metas", "niveis", params],
      queryFn: () => get<NiveisMetasResponse>("/niveis", params),
      ...comum(filtros),
      enabled: filtros.filiais.length > 0 && !!aba,
    });
  },
};
