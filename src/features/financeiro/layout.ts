import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela Financeiro · Fluxo de Caixa (D43): grade de 12 colunas.
 * `x`/`y` = coluna e linha do canto superior esquerdo; `h` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 2,
  itens: [
    { id: "kpis", x: 0, y: 0, w: 12, h: 3, visivel: true },
    { id: "evolucao-caixa", x: 0, y: 3, w: 7, h: 5, visivel: true },
    { id: "categorias", x: 7, y: 3, w: 5, h: 5, visivel: true },
    { id: "fluxo-previsto", x: 0, y: 8, w: 7, h: 5, visivel: true },
    { id: "compromissos", x: 7, y: 8, w: 5, h: 5, visivel: true },
    { id: "saldo-contas", x: 0, y: 13, w: 3, h: 5, visivel: true },
    { id: "evolucao-mensal", x: 3, y: 13, w: 5, h: 5, visivel: true },
    { id: "indicadores-caixa", x: 8, y: 13, w: 4, h: 5, visivel: true },
  ],
  blocos: {
    kpis: ["saldo", "entradas", "saidas", "resultado", "menor-saldo", "cobertura"].map((id) => ({
      id,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      visivel: true,
    })),
  },
};

/** Tamanhos mínimo e máximo de cada card (colunas × linhas). */
export const LIMITES: Limites = {
  kpis: { min: { w: 4, h: 2 }, max: { w: 12, h: 10 } },
  "evolucao-caixa": { min: { w: 4, h: 4 }, max: { w: 12, h: 12 } },
  categorias: { min: { w: 4, h: 4 }, max: { w: 12, h: 12 } },
  "fluxo-previsto": { min: { w: 5, h: 4 }, max: { w: 12, h: 20 } },
  compromissos: { min: { w: 4, h: 4 }, max: { w: 12, h: 20 } },
  "saldo-contas": { min: { w: 3, h: 4 }, max: { w: 8, h: 10 } },
  "evolucao-mensal": { min: { w: 4, h: 4 }, max: { w: 12, h: 12 } },
  "indicadores-caixa": { min: { w: 3, h: 5 }, max: { w: 8, h: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-caixa": "Evolução do Caixa",
  categorias: "Entradas e Saídas por Categoria",
  "fluxo-previsto": "Fluxo de Caixa Previsto",
  compromissos: "Compromissos a Vencer",
  "saldo-contas": "Saldo de Caixa por Conta",
  "evolucao-mensal": "Evolução das Entradas e Saídas",
  "indicadores-caixa": "Indicadores de Caixa",
};

/**
 * Fontes de dados por card (D46). Os cards usam contas a pagar, a receber e
 * cartões, que a tela inteira já exige (`TELAS` em `src/lib/acesso.ts`); o
 * Saldo por Conta não tem fonte (não integrado). Acrescente aqui o card que
 * passar a depender de outra fonte.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
