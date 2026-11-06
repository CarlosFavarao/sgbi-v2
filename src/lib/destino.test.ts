import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino";

describe("destinoSeguro", () => {
  it("aceita caminhos internos com busca", () => {
    expect(destinoSeguro("/vendas")).toBe("/vendas");
    expect(destinoSeguro("/financeiro/dfc?x=1")).toBe("/financeiro/dfc?x=1");
  });

  it("recusa outro site, o próprio login, a API e valores vazios", () => {
    expect(destinoSeguro("https://exemplo.com")).toBe("/");
    expect(destinoSeguro("//exemplo.com")).toBe("/");
    expect(destinoSeguro("/\\exemplo.com")).toBe("/");
    expect(destinoSeguro("/login")).toBe("/");
    expect(destinoSeguro("/login?de=/vendas")).toBe("/");
    expect(destinoSeguro("/api/filiais")).toBe("/");
    expect(destinoSeguro("")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });
});
