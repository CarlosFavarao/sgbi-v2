"use server";

import { redirect } from "next/navigation";
import { destinoSeguro } from "@/lib/destino";
import { autenticar, LoginError } from "@/server/login";
import { criarSessao, encerrarSessao } from "@/server/sessao";

export type EstadoLogin = { erro?: string; usuario?: string };

export async function entrar(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const usuario = String(form.get("usuario") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!usuario || !senha) return { erro: "Informe o usuário e a senha.", usuario };

  try {
    const logado = await autenticar(usuario, senha);
    await criarSessao(logado, form.get("manter") === "on");
  } catch (error) {
    if (error instanceof LoginError) return { erro: error.message, usuario };
    console.error("[login]", error);
    return { erro: "Erro ao entrar. Tente novamente.", usuario };
  }
  // Fora do try: o redirect interrompe a action lançando um erro do Next.
  redirect(destinoSeguro(form.get("de")));
}

/** Apaga a sessão; o cliente recarrega em /login (limpa o cache do React Query). */
export async function sair() {
  await encerrarSessao();
}
