import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão do Painel Executivo (D43): grade de 12 colunas; `h` em
 * unidades de linha (a unidade é calculada para o padrão ocupar a tela sem rolar).
 * `x`/`y` = coluna e linha do canto superior esquerdo. Ao mudar ids ou a estrutura, suba a `versao` (o salvo antigo é descartado).
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 3,
  itens: [
    { id: "kpis", x: 0, y: 0, w: 12, h: 5, visivel: true },
    { id: "evolucao-venda", x: 0, y: 5, w: 4, h: 6, visivel: true },
    { id: "evolucao-margem", x: 4, y: 5, w: 4, h: 6, visivel: true },
    { id: "meta", x: 8, y: 5, w: 4, h: 6, visivel: true },
    { id: "departamentos", x: 0, y: 11, w: 8, h: 7, visivel: true },
    { id: "alertas", x: 8, y: 11, w: 4, h: 7, visivel: true },
  ],
  blocos: {
    kpis: [
      "venda",
      "lucro-bruto",
      "margem-bruta",
      "despesas-operacionais",
      "resultado-operacional",
      "venda-vs-meta",
      "ticket-medio",
      "compra-sobre-venda",
      "cancelamentos",
      "descontos",
    ].map((id) => ({ id, x: 0, y: 0, w: 1, h: 1, visivel: true })),
  },
};

/** Tamanhos mínimo e máximo de cada card (colunas × linhas). */
export const LIMITES: Limites = {
  kpis: { min: { w: 4, h: 3 }, max: { w: 12, h: 10 } },
  "evolucao-venda": { min: { w: 3, h: 4 }, max: { w: 12, h: 12 } },
  "evolucao-margem": { min: { w: 3, h: 4 }, max: { w: 12, h: 12 } },
  meta: { min: { w: 3, h: 5 }, max: { w: 8, h: 10 } },
  departamentos: { min: { w: 5, h: 4 }, max: { w: 12, h: 20 } },
  alertas: { min: { w: 3, h: 4 }, max: { w: 12, h: 20 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-venda": "Evolução da Venda",
  "evolucao-margem": "Evolução da Margem Bruta",
  meta: "Venda vs Meta (acumulado)",
  departamentos: "Compra sobre Venda",
  alertas: "Alertas e Pontos de Atenção",
};

/**
 * Fontes de dados de cada card e KPI (`kpis:<id>`), D46: na plataforma que não
 * envia alguma delas ao banco do BI, o card fica desabilitado. A tela inteira
 * exige `venda` (`TELAS` em `src/lib/acesso.ts`).
 */
export const FONTES: Record<string, readonly Fonte[]> = {
  "evolucao-venda": ["venda"],
  "evolucao-margem": ["venda"],
  meta: ["metas", "venda"],
  departamentos: ["venda", "compra"],
  // Os alertas comparam venda, despesas, cancelamentos (sobre a venda PDV) e compra sobre venda.
  alertas: ["venda", "pdv", "cancelamentos", "despesas", "compra"],
  "kpis:venda": ["venda"],
  "kpis:lucro-bruto": ["venda"],
  "kpis:margem-bruta": ["venda"],
  "kpis:despesas-operacionais": ["despesas", "venda"],
  "kpis:resultado-operacional": ["despesas", "venda"],
  "kpis:venda-vs-meta": ["metas", "venda"],
  "kpis:ticket-medio": ["pdv"],
  "kpis:compra-sobre-venda": ["compra", "venda"],
  "kpis:cancelamentos": ["cancelamentos", "pdv"],
  "kpis:descontos": ["pdv"],
};
