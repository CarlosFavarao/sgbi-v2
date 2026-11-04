import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { filiaisQuery, getJson, STALE_TIME } from "@/lib/api";
import type { CompromissosResponse, FiltrosFinanceiro, MovimentosResponse, Periodo, PrazosResponse } from "./types";

const BASE = "/api/financeiro";
const get = <T,>(path: string, params: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);
const filiais = (f: FiltrosFinanceiro) => [...f.filiais].sort((a, b) => a - b).join(",");

const comum = (f: FiltrosFinanceiro, pronto: boolean) => ({
  staleTime: STALE_TIME,
  placeholderData: keepPreviousData,
  enabled: f.filiais.length > 0 && pronto,
});

export const financeiroQueries = {
  filiais: filiaisQuery,

  movimentos: (f: FiltrosFinanceiro, periodo: Periodo | null, referencia: string | null) => {
    const params = { filiais: filiais(f), inicio: periodo?.inicio ?? "", fim: periodo?.fim ?? "", referencia: referencia ?? "" };
    return queryOptions({
      queryKey: ["financeiro", "movimentos", params],
      queryFn: () => get<MovimentosResponse>("/movimentos", params),
      ...comum(f, !!periodo && !!referencia),
    });
  },

  compromissos: (f: FiltrosFinanceiro, referencia: string | null, dias: number) => {
    const params = { filiais: filiais(f), referencia: referencia ?? "", dias: String(dias) };
    return queryOptions({
      queryKey: ["financeiro", "compromissos", params],
      queryFn: () => get<CompromissosResponse>("/compromissos", params),
      ...comum(f, !!referencia),
    });
  },

  prazos: (f: FiltrosFinanceiro, periodo: Periodo | null) => {
    const params = { filiais: filiais(f), inicio: periodo?.inicio ?? "", fim: periodo?.fim ?? "" };
    return queryOptions({
      queryKey: ["financeiro", "prazos", params],
      queryFn: () => get<PrazosResponse>("/prazos", params),
      ...comum(f, !!periodo),
    });
  },
};
