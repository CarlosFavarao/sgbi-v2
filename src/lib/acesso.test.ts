import { describe, expect, it } from "vitest";
import {
  bloqueio,
  bloqueioDaTela,
  detalheDoBloqueio,
  listaDeFontes,
  normalizarPlataforma,
  permitido,
  temFontes,
  tituloDoBloqueio,
  type Acesso,
} from "./acesso";

const vx: Acesso = { plataforma: "vx", permitidos: null };
const fivewin: Acesso = { plataforma: "fivewin", permitidos: null };

describe("normalizarPlataforma", () => {
  it("lê o sistema do login como o BI antigo (vazio ou desconhecido = VX)", () => {
    expect(normalizarPlataforma(" fivewin ")).toBe("fivewin");
    expect(normalizarPlataforma("CLOUD")).toBe("cloud");
    expect(normalizarPlataforma("SGVX")).toBe("vx");
    expect(normalizarPlataforma(undefined)).toBe("vx");
    expect(normalizarPlataforma(42)).toBe("vx");
  });
});

describe("bloqueio por plataforma", () => {
  it("VX tem todas as fontes", () => {
    expect(bloqueio(vx, "painel-executivo:departamentos", ["venda", "compra"])).toBeNull();
  });

  it("Fivewin bloqueia o card que usa uma fonte ausente e diz qual", () => {
    expect(bloqueio(fivewin, "painel-executivo:departamentos", ["venda", "compra"])).toEqual({
      motivo: "plataforma",
      plataforma: "fivewin",
      fontes: ["compra"],
    });
    expect(bloqueio(fivewin, "painel-executivo:evolucao-venda", ["venda"])).toBeNull();
  });

  it("tela inteira: Metas e Fluxo de Caixa ficam indisponíveis no Fivewin; Vendas não", () => {
    expect(bloqueioDaTela(fivewin, "metas")?.motivo).toBe("plataforma");
    expect(bloqueioDaTela(fivewin, "financeiro")?.motivo).toBe("plataforma");
    expect(bloqueioDaTela(fivewin, "vendas")).toBeNull();
    expect(bloqueioDaTela(vx, "metas")).toBeNull();
  });

  it("temFontes só olha a plataforma", () => {
    expect(temFontes({ plataforma: "fivewin", permitidos: [] }, ["venda"])).toBe(true);
    expect(temFontes(fivewin, ["despesas"])).toBe(false);
  });
});

describe("bloqueio por permissão", () => {
  it("sem restrição (null) libera tudo", () => {
    expect(permitido(null, "vendas:curva-abc")).toBe(true);
  });

  it("liberar a tela libera os cards; liberar um card libera a tela e o bloco que o contêm", () => {
    const p = ["vendas", "painel-executivo:kpis:venda"];
    expect(permitido(p, "vendas:curva-abc")).toBe(true);
    expect(permitido(p, "painel-executivo")).toBe(true);
    expect(permitido(p, "painel-executivo:kpis")).toBe(true);
    expect(permitido(p, "painel-executivo:kpis:venda")).toBe(true);
    expect(permitido(p, "painel-executivo:kpis:despesas-operacionais")).toBe(false);
    expect(permitido(p, "painel-executivo:alertas")).toBe(false);
    expect(permitido(p, "metas")).toBe(false);
  });

  it("não confunde prefixos parecidos", () => {
    expect(permitido(["vendas"], "vendas-extra")).toBe(false);
  });

  it("a falta de dados da plataforma vem antes da permissão", () => {
    const b = bloqueio({ plataforma: "fivewin", permitidos: [] }, "metas", ["metas"]);
    expect(b?.motivo).toBe("plataforma");
    expect(bloqueio({ plataforma: "vx", permitidos: [] }, "metas", ["metas"])).toEqual({ motivo: "permissao" });
  });
});

describe("textos", () => {
  it("lista as fontes em português", () => {
    expect(listaDeFontes(["compra"])).toBe("compras");
    expect(listaDeFontes(["contas-pagar", "contas-receber", "cartoes"])).toBe(
      "contas a pagar, contas a receber e vendas em cartão",
    );
  });

  it("título e detalhe do bloqueio", () => {
    const b = bloqueio(fivewin, "x", ["despesas"])!;
    expect(tituloDoBloqueio(b)).toBe("Indisponível no Fivewin");
    expect(detalheDoBloqueio(b)).toBe("O Fivewin ainda não envia ao banco do BI: despesas.");
    expect(tituloDoBloqueio({ motivo: "permissao" })).toBe("Sem permissão");
  });
});
