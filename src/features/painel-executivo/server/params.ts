import "server-only";

import { unstable_rethrow } from "next/navigation";
import { daysBetween } from "../date";
import type { Comparacao, Nivel, Origem, Periodo } from "../types";

export class ParamError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 366;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], name: string): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  throw new ParamError(`Parâmetro "${name}" inválido. Use: ${allowed.join(", ")}.`);
}

export function parsePeriodo(params: URLSearchParams): Periodo {
  const inicio = params.get("inicio") ?? "";
  const fim = params.get("fim") ?? "";
  if (!ISO_DATE.test(inicio) || !ISO_DATE.test(fim)) {
    throw new ParamError('Parâmetros "inicio" e "fim" são obrigatórios (YYYY-MM-DD).');
  }
  const dias = daysBetween(inicio, fim);
  if (Number.isNaN(dias) || dias < 0) throw new ParamError('"inicio" deve ser anterior a "fim".');
  if (dias >= MAX_DIAS) throw new ParamError(`O período pode ter no máximo ${MAX_DIAS} dias.`);
  return { inicio, fim };
}

/** Lista ordenada e sem repetição (estável para a chave de cache). */
export function parseFiliais(params: URLSearchParams): number[] {
  const filiais = (params.get("filiais") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (!filiais.length || filiais.some((f) => !Number.isInteger(f) || f <= 0)) {
    throw new ParamError('Parâmetro "filiais" é obrigatório (ex.: 1,2,7).');
  }
  return [...new Set(filiais)].sort((a, b) => a - b);
}

export function parseOrigem(params: URLSearchParams): Origem {
  return oneOf(params.get("origem") ?? "todos", ["todos", "pdv", "faturamento"], "origem");
}

export function parseComparacao(params: URLSearchParams): Comparacao {
  return oneOf(
    params.get("comparacao") ?? "periodo-anterior",
    ["periodo-anterior", "ano-anterior"],
    "comparacao",
  );
}

export function parseNivel(params: URLSearchParams): Nivel {
  return oneOf(params.get("nivel") ?? "departamento", ["departamento", "grupo", "subgrupo"], "nivel");
}

/** Responde 400 para parâmetros inválidos e 500 (sem detalhes) para o resto. */
export async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (error) {
    // Erros internos do Next (ex.: interrupção do prerender) não são falhas da rota.
    unstable_rethrow(error);
    if (error instanceof ParamError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[painel-executivo]", error);
    return Response.json({ error: "Erro ao consultar os dados." }, { status: 500 });
  }
}
