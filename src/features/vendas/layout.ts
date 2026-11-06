import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela de Vendas (D43): grade de 12 colunas.
 * `x`/`y` = coluna e linha do canto superior esquerdo; `h` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 2,
  itens: [
    { id: "kpis", x: 0, y: 0, w: 12, h: 3, visivel: true },
    { id: "evolucao-vendas", x: 0, y: 3, w: 4, h: 5, visivel: true },
    { id: "departamentos", x: 4, y: 3, w: 4, h: 5, visivel: true },
    { id: "evolucao-margem", x: 8, y: 3, w: 4, h: 5, visivel: true },
    { id: "desempenho", x: 0, y: 8, w: 8, h: 6, visivel: true },
    { id: "curva-abc", x: 8, y: 8, w: 4, h: 6, visivel: true },
    { id: "queda", x: 0, y: 14, w: 3, h: 4, visivel: true },
    { id: "crescimento", x: 3, y: 14, w: 3, h: 4, visivel: true },
    { id: "maior-margem", x: 6, y: 14, w: 3, h: 4, visivel: true },
    { id: "menor-margem", x: 9, y: 14, w: 3, h: 4, visivel: true },
  ],
  blocos: {
    kpis: ["venda", "margem-bruta", "lucro-bruto", "ticket-medio", "cupons", "itens-por-cupom"].map((id) => ({
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
  "evolucao-vendas": { min: { w: 3, h: 4 }, max: { w: 12, h: 12 } },
  departamentos: { min: { w: 3, h: 4 }, max: { w: 12, h: 14 } },
  "evolucao-margem": { min: { w: 3, h: 4 }, max: { w: 12, h: 12 } },
  desempenho: { min: { w: 5, h: 4 }, max: { w: 12, h: 20 } },
  "curva-abc": { min: { w: 4, h: 4 }, max: { w: 12, h: 12 } },
  queda: { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
  crescimento: { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
  "maior-margem": { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
  "menor-margem": { min: { w: 3, h: 4 }, max: { w: 6, h: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-vendas": "Evolução das Vendas",
  departamentos: "Vendas por Departamento",
  "evolucao-margem": "Evolução da Margem Bruta",
  desempenho: "Desempenho de Vendas",
  "curva-abc": "Classificação ABC de Produtos",
  queda: "Produtos A com maior queda",
  crescimento: "Produtos A com maior crescimento",
  "maior-margem": "Produtos com maior margem bruta",
  "menor-margem": "Produtos com menor margem bruta",
};

/**
 * Fontes de dados de cada card e KPI (`kpis:<id>`), D46: na plataforma que não
 * envia alguma delas ao banco do BI, o card fica desabilitado. A tela inteira
 * exige `venda` (`TELAS` em `src/lib/acesso.ts`).
 */
export const FONTES: Record<string, readonly Fonte[]> = {
  "evolucao-vendas": ["venda"],
  departamentos: ["venda"],
  "evolucao-margem": ["venda"],
  desempenho: ["venda", "pdv"],
  "curva-abc": ["venda"],
  queda: ["venda"],
  crescimento: ["venda"],
  "maior-margem": ["venda"],
  "menor-margem": ["venda"],
  "kpis:venda": ["venda"],
  "kpis:margem-bruta": ["venda"],
  "kpis:lucro-bruto": ["venda"],
  "kpis:ticket-medio": ["pdv"],
  "kpis:cupons": ["pdv"],
  "kpis:itens-por-cupom": ["pdv"],
};
