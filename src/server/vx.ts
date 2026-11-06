import "server-only";

import { db } from "@/db";
import { tokens } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Cliente da API do VX (`API_VIEW`, `docs/api-externa-mapeamento.md`). O token
 * da tabela `tokens` vai no header `Authorization` quando existe (em
 * homologação a tabela está vazia e a API responde sem ele). O token nunca sai
 * do servidor.
 */
const BASE = () => `${env.apiView}/sgsistemas/v1`;
const TEMPO_LIMITE = 10_000;

/** Erro da API do VX: `status` é o HTTP da resposta, ou 0 quando a API não respondeu. */
export class VxError extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export async function tokenDaApi(): Promise<string | null> {
  const [linha] = await db.select({ token: tokens.token }).from(tokens).limit(1);
  return linha?.token || null;
}

export async function vx<T>(caminho: string, init: { method?: "GET" | "POST"; corpo?: unknown } = {}): Promise<T> {
  const token = await tokenDaApi();
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE()}${caminho}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: init.corpo === undefined ? undefined : JSON.stringify(init.corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE),
    });
  } catch (error) {
    throw new VxError(0, error instanceof Error ? error.message : "API do VX indisponível.");
  }
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new VxError(resposta.status, corpo?.message ?? resposta.statusText);
  return corpo as T;
}

/** Versão e dados do cliente do VX (`GET /status`), mostrados na tela de login. */
export type StatusVx = {
  versao?: string;
  revisao?: string;
  nomeVersao?: string;
  dataVersao?: string;
  cnpjFilialBase?: string;
  codigoCliente?: string | number;
  nomeFantasia?: string;
};

export const statusDoVx = () => vx<StatusVx>("/status");
