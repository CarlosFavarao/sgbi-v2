import { connection } from "next/server";
import { acessoDoUsuario } from "@/server/acesso";
import { usuarioAtual } from "@/server/sessao";

/** Usuário logado (identidade) e o que ele pode ver (plataforma e permissões, D46). */
export async function GET() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { login, nome, admin } = usuario;
  return Response.json({ usuario: { login, nome, admin }, acesso: acessoDoUsuario(usuario) });
}
