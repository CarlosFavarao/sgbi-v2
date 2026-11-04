import type { Periodo } from "./filtros";

/**
 * Período inicial das telas. Em homologação os dados completos mais recentes são
 * de julho/2026; troque por "mês atual" quando a carga estiver em dia (P7 em
 * docs/decisoes-e-pendencias.md).
 */
export const PERIODO_PADRAO: Periodo = { inicio: "2026-07-01", fim: "2026-07-31" };
