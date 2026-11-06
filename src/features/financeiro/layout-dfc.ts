import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela Financeiro · DFC (D43): grade de 12 colunas.
 * `x`/`y` = coluna e linha do canto superior esquerdo; `h` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 2,
  itens: [
    { id: "kpis", x: 0, y: 0, w: 12, h: 3, visivel: true },
    { id: "tabela", x: 0, y: 3, w: 7, h: 9, visivel: true },
    { id: "evolucao", x: 7, y: 3, w: 5, h: 4, visivel: true },
    { id: "composicao", x: 7, y: 7, w: 5, h: 5, visivel: true },
    { id: "saldo-conta", x: 0, y: 12, w: 5, h: 6, visivel: true },
    { id: "movimentacoes", x: 5, y: 12, w: 7, h: 6, visivel: true },
  ],
  blocos: {
    kpis: ["saldo-inicial", "entradas", "saidas", "geracao", "saldo-final"].map((id) => ({
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
  tabela: { min: { w: 5, h: 5 }, max: { w: 12, h: 20 } },
  evolucao: { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
  composicao: { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
  "saldo-conta": { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
  movimentacoes: { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  tabela: "DFC Gerencial",
  evolucao: "Evolução da Geração de Caixa",
  composicao: "Composição das Entradas e Saídas",
  "saldo-conta": "Saldo por Conta Financeira",
  movimentacoes: "Movimentações Relevantes do Período",
};

/**
 * Fontes de dados por card (D46). A DFC ainda não tem fonte de caixa (P51):
 * quando tiver, declare aqui as fontes de cada card.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
