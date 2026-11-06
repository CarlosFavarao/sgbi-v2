import "server-only";

import { unstable_rethrow } from "next/navigation";
import { daysBetween } from "@/lib/date";
import type { Nivel, Origem, Periodo } from "@/lib/filtros";
import { AcessoNegado } from "./acesso";
import { usuarioAtual } from "./sessao";

export class ParamError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 366;

export function oneOf<T extends string>(value: string | null, allowed: readonly T[], name: string): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  throw new ParamError(`Parâmetro "${name}" inválido. Use: ${allowed.join(", ")}.`);
}

export function parsePeriodo(
  params: URLSearchParams,
  [chaveInicio, chaveFim]: [string, string] = ["inicio", "fim"],
): Periodo {
  const inicio = params.get(chaveInicio) ?? "";
  const fim = params.get(chaveFim) ?? "";
  if (!ISO_DATE.test(inicio) || !ISO_DATE.test(fim)) {
    throw new ParamError(`Parâmetros "${chaveInicio}" e "${chaveFim}" são obrigatórios (YYYY-MM-DD).`);
  }
  const dias = daysBetween(inicio, fim);
  if (Number.isNaN(dias) || dias < 0) throw new ParamError(`"${chaveInicio}" deve ser anterior a "${chaveFim}".`);
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

/** Período de comparação, já resolvido em datas pelo cliente. */
export function parsePeriodoComparacao(params: URLSearchParams): Periodo {
  return parsePeriodo(params, ["comparacaoInicio", "comparacaoFim"]);
}

export function parseNivel(params: URLSearchParams): Nivel {
  return oneOf(params.get("nivel") ?? "departamento", ["departamento", "grupo", "subgrupo"], "nivel");
}


/**
 * Responde 401 sem sessão (o `proxy.ts` já barra antes; aqui é a checagem perto
 * dos dados), 403 quando `exigirAcesso` recusa (plataforma sem a fonte ou sem
 * permissão, D46), 400 para parâmetros inválidos e 500 (sem detalhes) para o resto.
 */
export async function handle<T>(fn: () => Promise<T>, contexto = "api"): Promise<Response> {
  try {
    if (!(await usuarioAtual())) {
      return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
    }
    return Response.json(await fn());
  } catch (error) {
    // Erros internos do Next (ex.: interrupção do prerender) não são falhas da rota.
    unstable_rethrow(error);
    if (error instanceof AcessoNegado) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ParamError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(`[${contexto}]`, error);
    return Response.json({ error: "Erro ao consultar os dados." }, { status: 500 });
  }
}
