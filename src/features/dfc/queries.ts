import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { getJson, STALE_TIME } from "@/lib/api";
import type { Periodo } from "@/lib/filtros";
import type { DreResponse, FiltrosDfc, MovimentacoesResponse, OpcoesDfcResponse } from "./types";

const BASE = "/api/dfc";
const get = <T,>(path: string, params?: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);
const filiais = (f: FiltrosDfc) => [...f.filiais].sort((a, b) => a - b).join(",");

export const dfcQueries = {
  opcoes: () =>
    queryOptions({
      queryKey: ["dfc", "opcoes"],
      queryFn: () => get<OpcoesDfcResponse>("/opcoes"),
      staleTime: Infinity,
    }),

  /** DRE dos meses (o histórico inteiro de uma vez: a tela calcula mês, comparação, acumulado e 12 meses). */
  dre: (f: FiltrosDfc, meses: { inicio: string; fim: string } | null) => {
    const params = { filiais: filiais(f), mesInicio: meses?.inicio ?? "", mesFim: meses?.fim ?? "" };
    return queryOptions({
      queryKey: ["dfc", "dre", params],
      queryFn: () => get<DreResponse>("/dre", params),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: f.filiais.length > 0 && !!meses,
    });
  },

  movimentacoes: (f: FiltrosDfc, periodo: Periodo | null) => {
    const params = { filiais: filiais(f), inicio: periodo?.inicio ?? "", fim: periodo?.fim ?? "" };
    return queryOptions({
      queryKey: ["dfc", "movimentacoes", params],
      queryFn: () => get<MovimentacoesResponse>("/movimentacoes", params),
      staleTime: STALE_TIME,
      placeholderData: keepPreviousData,
      enabled: f.filiais.length > 0 && !!periodo,
    });
  },
};
