import { NextResponse, type NextRequest } from "next/server";
import { lerSessao, nomeDoCookie } from "@/server/sessao";

/**
 * Checagem otimista da sessão (D45), só pelo cookie: sem sessão, as telas
 * redirecionam para /login (guardando o destino em `?de=`) e as rotas da API
 * respondem 401. Logado, /login volta para o Painel. As rotas da API checam de
 * novo no `handle()` (`src/server/params.ts`).
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const usuario = await lerSessao(request.cookies.get(nomeDoCookie())?.value);

  if (pathname === "/login") {
    return usuario ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (usuario) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("de", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Tudo, menos arquivos estáticos do Next e imagens.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
