import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela de Metas (D43): grade de 12 colunas.
 * `x`/`y` = coluna e linha do canto superior esquerdo; `h` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 2,
  itens: [
    { id: "kpis", x: 0, y: 0, w: 12, h: 3, visivel: true },
    { id: "cumprimento", x: 0, y: 3, w: 8, h: 4, visivel: true },
    { id: "atingimento", x: 8, y: 3, w: 4, h: 4, visivel: true },
    { id: "acompanhamento", x: 0, y: 7, w: 12, h: 6, visivel: true },
    { id: "metas-periodo", x: 0, y: 13, w: 3, h: 5, visivel: true },
    { id: "em-risco", x: 3, y: 13, w: 3, h: 5, visivel: true },
    { id: "melhores", x: 6, y: 13, w: 3, h: 5, visivel: true },
    { id: "margem", x: 9, y: 13, w: 3, h: 5, visivel: true },
  ],
  blocos: {
    kpis: ["meta", "realizado", "atingimento", "diferenca", "projecao", "status"].map((id) => ({
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
  cumprimento: { min: { w: 4, h: 4 }, max: { w: 12, h: 12 } },
  atingimento: { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
  acompanhamento: { min: { w: 6, h: 4 }, max: { w: 12, h: 20 } },
  "metas-periodo": { min: { w: 3, h: 5 }, max: { w: 6, h: 12 } },
  "em-risco": { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
  melhores: { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
  margem: { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  cumprimento: "Evolução do Cumprimento da Meta",
  atingimento: "Atingimento por Departamento",
  acompanhamento: "Acompanhamento das Metas",
  "metas-periodo": "Metas por Período",
  "em-risco": "Departamentos em Risco",
  melhores: "Melhor Desempenho",
  margem: "Situação da Margem Bruta",
};

/**
 * Fontes de dados por card (D46). Todos os cards usam meta e venda, que a tela
 * inteira já exige (`TELAS` em `src/lib/acesso.ts`); acrescente aqui o card que
 * passar a depender de outra fonte.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
