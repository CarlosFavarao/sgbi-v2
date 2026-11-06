import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { normalizarPlataforma, type Plataforma } from "@/lib/acesso";
import { env } from "@/lib/env";

/**
 * Sessão do usuário (D45): JWT assinado (HS256, `JWT_SECRET`) num cookie
 * httpOnly, como no BI antigo. Guarda a identidade e a plataforma do cliente
 * (D46); as permissões ficam para quando forem decididas (P59). Lida no `proxy.ts` (redireciona para o login)
 * e de novo no `handle()` das rotas, perto dos dados.
 */
export type Usuario = { login: string; nome: string; admin: boolean; plataforma: Plataforma };

/** Validade da sessão, como no BI antigo. */
const DURACAO_MS = 24 * 60 * 60 * 1000;

const chave = () => new TextEncoder().encode(env.jwtSecret);

/** Nome próprio por instalação (`CLIENT_SLUG`) e diferente do BI antigo (`session`), para não se misturarem. */
export function nomeDoCookie() {
  const slug = env.clientSlug;
  return slug ? `sgbi-sessao-${slug}` : "sgbi-sessao";
}

/** Usuário do cookie, ou `null` se não houver, estiver vencido, adulterado ou for de outra instalação. */
export async function lerSessao(valor: string | undefined): Promise<Usuario | null> {
  if (!valor) return null;
  try {
    const { payload } = await jwtVerify(valor, chave(), { algorithms: ["HS256"] });
    const usuario = payload.usuario as Usuario | undefined;
    if (!usuario?.login || payload.slug !== env.clientSlug) return null;
    return {
      login: usuario.login,
      nome: usuario.nome,
      admin: usuario.admin === true,
      // Sessões criadas antes da plataforma existir valem como VX.
      plataforma: normalizarPlataforma(usuario.plataforma),
    };
  } catch {
    return null;
  }
}

/** Usuário da requisição atual (Route Handlers e Server Actions). */
export async function usuarioAtual(): Promise<Usuario | null> {
  return lerSessao((await cookies()).get(nomeDoCookie())?.value);
}

/**
 * Cria a sessão. Sem "manter conectado", o cookie some ao fechar o navegador;
 * com, dura até o fim da validade (24 h). O JWT vence em 24 h nos dois casos.
 */
export async function criarSessao(usuario: Usuario, manterConectado: boolean) {
  const expira = new Date(Date.now() + DURACAO_MS);
  const token = await new SignJWT({ usuario, slug: env.clientSlug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(chave());
  // Os clientes acessam por http na rede interna: `secure` só quando a página veio por https.
  const https = (await headers()).get("origin")?.startsWith("https://") ?? false;
  (await cookies()).set(nomeDoCookie(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    path: "/",
    ...(manterConectado ? { expires: expira } : {}),
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(nomeDoCookie());
}
