import "server-only";

import { ParamError } from "@/server/params";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Data de referência ("hoje" da tela). */
export function parseReferencia(params: URLSearchParams): string {
  const referencia = params.get("referencia") ?? "";
  if (!ISO_DATE.test(referencia)) throw new ParamError('Parâmetro "referencia" é obrigatório (YYYY-MM-DD).');
  return referencia;
}

/** Dias à frente da referência (compromissos a vencer). */
export function parseDias(params: URLSearchParams): number {
  const dias = Number(params.get("dias") ?? 30);
  if (!Number.isInteger(dias) || dias < 1 || dias > 90) throw new ParamError('Parâmetro "dias" deve ser de 1 a 90.');
  return dias;
}
