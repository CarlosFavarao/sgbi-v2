import "server-only";

import { ParamError } from "@/server/params";

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_MESES = 36;

/** Intervalo de meses (`mesInicio`, `mesFim`, YYYY-MM), com no máximo 36 meses. */
export function parseMeses(params: URLSearchParams): { inicio: string; fim: string } {
  const inicio = params.get("mesInicio") ?? "";
  const fim = params.get("mesFim") ?? "";
  if (!MES.test(inicio) || !MES.test(fim)) {
    throw new ParamError('Parâmetros "mesInicio" e "mesFim" são obrigatórios (YYYY-MM).');
  }
  const [ai, mi] = inicio.split("-").map(Number);
  const [af, mf] = fim.split("-").map(Number);
  const meses = (af - ai) * 12 + mf - mi + 1;
  if (meses < 1) throw new ParamError('"mesInicio" deve ser anterior a "mesFim".');
  if (meses > MAX_MESES) throw new ParamError(`O intervalo pode ter no máximo ${MAX_MESES} meses.`);
  return { inicio, fim };
}
