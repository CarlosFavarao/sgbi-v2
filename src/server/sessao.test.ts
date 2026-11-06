import { SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";

// `env` exige as variáveis ao importar; a sessão só usa JWT_SECRET e CLIENT_SLUG.
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";

let lerSessao: typeof import("./sessao").lerSessao;
let nomeDoCookie: typeof import("./sessao").nomeDoCookie;

beforeAll(async () => {
  for (const nome of ["API_VIEW", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_DATABASE"]) vi.stubEnv(nome, "x");
  vi.stubEnv("JWT_SECRET", SEGREDO);
  vi.stubEnv("CLIENT_SLUG", "");
  ({ lerSessao, nomeDoCookie } = await import("./sessao"));
});

const usuario = { login: "JOAO", nome: "João", admin: false, plataforma: "fivewin" as const };

function token(payload: Record<string, unknown>, { segredo = SEGREDO, expira = "1h" } = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(new TextEncoder().encode(segredo));
}

describe("lerSessao", () => {
  it("devolve só a identidade de um token válido", async () => {
    expect(await lerSessao(await token({ usuario: { ...usuario, extra: 1 }, slug: "" }))).toEqual(usuario);
  });

  it("sessão sem plataforma (criada antes dela) vale como VX", async () => {
    const antigo: Partial<typeof usuario> = { ...usuario };
    delete antigo.plataforma;
    expect((await lerSessao(await token({ usuario: antigo, slug: "" })))?.plataforma).toBe("vx");
  });

  it("recusa sem cookie, adulterado, vencido ou de outra instalação", async () => {
    expect(await lerSessao(undefined)).toBeNull();
    expect(await lerSessao("lixo")).toBeNull();
    expect(await lerSessao(await token({ usuario, slug: "" }, { segredo: "outro-segredo-com-mais-de-32-caracteres!!" }))).toBeNull();
    expect(await lerSessao(await token({ usuario, slug: "" }, { expira: "-1m" }))).toBeNull();
    expect(await lerSessao(await token({ usuario, slug: "outro-cliente" }))).toBeNull();
    expect(await lerSessao(await token({ slug: "" }))).toBeNull();
  });

  it("cookie com nome próprio, diferente do BI antigo", () => {
    expect(nomeDoCookie()).toBe("sgbi-sessao");
  });
});
