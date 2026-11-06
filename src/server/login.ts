import "server-only";

import { normalizarPlataforma } from "@/lib/acesso";
import type { Usuario } from "./sessao";
import { tokenDaApi, vx, VxError } from "./vx";

/** Resposta do `POST /sgbi/login` do VX (só os campos usados; ver `docs/api-externa-mapeamento.md`). */
type LoginVx = { login: string; nome?: string; admin?: boolean; sistema?: string };

/** Mensagens do BI antigo por status do VX. O 403 (usuário sem relatórios liberados) volta com as permissões (P59). */
const MENSAGENS: Record<number, string> = {
  400: "Usuário ou senha inválidos.",
  401: "Usuário sem permissão. Se necessário, entre em contato com o suporte da SG Sistemas.",
  403: "Usuário sem permissão para acessar a plataforma.",
};

export class LoginError extends Error {}

/**
 * Valida usuário e senha no VX. Como no BI antigo: com token cadastrado, o
 * usuário vai em minúsculas e a senha como digitada; sem token (VX que não
 * exige), os dois vão em maiúsculas. Sem regra de permissão por enquanto (P59):
 * quem o VX aceita, entra.
 */
export async function autenticar(usuario: string, senha: string): Promise<Usuario> {
  const comToken = !!(await tokenDaApi());
  try {
    const dados = await vx<LoginVx>("/sgbi/login", {
      method: "POST",
      corpo: {
        usuario: comToken ? usuario.toLowerCase() : usuario.toUpperCase(),
        senha: comToken ? senha : senha.toUpperCase(),
      },
    });
    if (!dados?.login) throw new LoginError("Resposta inesperada do VX ao entrar.");
    return {
      login: dados.login,
      nome: dados.nome?.trim() || dados.login,
      admin: dados.admin === true,
      // VX, Cloud ou Fivewin: define o que o banco do BI tem (D46).
      plataforma: normalizarPlataforma(dados.sistema),
    };
  } catch (error) {
    if (error instanceof LoginError) throw error;
    if (error instanceof VxError) {
      if (MENSAGENS[error.status]) throw new LoginError(MENSAGENS[error.status]);
      console.error("[login] VX respondeu", error.status, error.message);
      throw new LoginError(
        error.status === 0 ? "Não foi possível conectar à API do VX." : "Erro na API do VX ao entrar.",
      );
    }
    throw error;
  }
}
