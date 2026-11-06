import "server-only";

import { bloqueio, detalheDoBloqueio, normalizarPlataforma, type Acesso, type Fonte, type Tela } from "@/lib/acesso";
import { env } from "@/lib/env";
import { usuarioAtual, type Usuario } from "./sessao";

/** Acesso negado numa rota da API: o `handle()` responde 403 com a mensagem. */
export class AcessoNegado extends Error {}

/**
 * O que o usuário pode ver (D46): a plataforma vem do login (ou de
 * `PLATAFORMA`, para testes); as permissões ainda não foram decididas (P59),
 * então ninguém é restringido (`null`).
 */
export function acessoDoUsuario(usuario: Usuario): Acesso {
  const plataforma = env.plataforma ? normalizarPlataforma(env.plataforma) : usuario.plataforma;
  return { plataforma, permitidos: null };
}

/**
 * Checagem nas rotas da API, perto dos dados: a tela precisa estar liberada e a
 * plataforma precisa ter as fontes que a consulta lê (sem elas, a resposta
 * viria zerada e pareceria dado real).
 */
export async function exigirAcesso(tela: Tela, fontes: readonly Fonte[]) {
  const usuario = await usuarioAtual();
  if (!usuario) throw new AcessoNegado("Sessão expirada. Entre novamente.");
  const b = bloqueio(acessoDoUsuario(usuario), tela, fontes);
  if (b) throw new AcessoNegado(detalheDoBloqueio(b));
}
