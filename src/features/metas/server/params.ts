import "server-only";

import { ParamError, parsePeriodo } from "@/server/params";
import type { Periodo } from "../types";

/** Departamento do filtro; ausente = todos. */
export function parseDepartamento(params: URLSearchParams): number | null {
  const valor = params.get("departamento");
  if (!valor) return null;
  const codigo = Number(valor);
  if (!Number.isInteger(codigo) || codigo <= 0) throw new ParamError('Parâmetro "departamento" inválido.');
  return codigo;
}

/** Período opcional (ex.: aba que ainda não começou não tem parte decorrida). */
export function parsePeriodoOpcional(params: URLSearchParams, prefixo: string): Periodo | null {
  const chaves: [string, string] = [`${prefixo}Inicio`, `${prefixo}Fim`];
  if (!params.get(chaves[0]) && !params.get(chaves[1])) return null;
  return parsePeriodo(params, chaves);
}
