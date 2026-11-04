import type { AtividadeDfc } from "./types";

export type LinhaDfcConfig = {
  id: string;
  label: string;
  atividade: AtividadeDfc;
  tipo: "entrada" | "saida";
  /**
   * Prefixos de `id_geral` da DRE somados na linha. O prefixo mais longo vence:
   * "08002" (despesas operacionais) não leva o "08002002" (pessoal), que tem linha própria.
   */
  prefixos: string[];
};

/**
 * DFC gerencial **estimada pela DRE** (regime de competência, P51): cada linha
 * da DFC soma grupos/subgrupos da `view_dre`. Os códigos são os do plano de
 * DRE do cliente de homologação (P52); ajuste aqui se o plano mudar.
 */
export const LINHAS_DFC: LinhaDfcConfig[] = [
  // 1. Atividades operacionais
  {
    id: "vendas-pdv",
    label: "Recebimentos de vendas no PDV",
    atividade: "operacional",
    tipo: "entrada",
    prefixos: ["01001"],
  },
  {
    id: "vendas-faturamento",
    label: "Recebimentos de vendas faturadas",
    atividade: "operacional",
    tipo: "entrada",
    prefixos: ["01002"],
  },
  {
    id: "outros-recebimentos",
    label: "Outros recebimentos (juros, verbas, descontos obtidos)",
    atividade: "operacional",
    tipo: "entrada",
    prefixos: ["06"],
  },
  {
    id: "fornecedores",
    label: "Pagamentos a fornecedores (mercadorias, pelo CMV)",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["04"],
  },
  {
    id: "pessoal",
    label: "Despesas com pessoal e encargos",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["08002002"],
  },
  {
    id: "operacionais",
    label: "Despesas operacionais (administrativas, serviços, manutenção…)",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["08002"],
  },
  {
    id: "impostos",
    label: "Impostos e taxas (sobre a receita, IRPJ e CSLL)",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["08001", "08004"],
  },
  {
    id: "devolucoes",
    label: "Devoluções e descontos de vendas",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["02"],
  },
  {
    id: "outras-deducoes",
    label: "Outras deduções (cheques devolvidos, descontos concedidos…)",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["07"],
  },
  {
    id: "outras-nao-operacionais",
    label: "Outras despesas não operacionais",
    atividade: "operacional",
    tipo: "saida",
    prefixos: ["08003"],
  },
  // 2. Atividades de investimento
  { id: "investimentos", label: "Investimentos", atividade: "investimento", tipo: "saida", prefixos: ["08003009"] },
  {
    id: "imobilizado",
    label: "Aquisição de ativo imobilizado",
    atividade: "investimento",
    tipo: "saida",
    prefixos: ["08003015"],
  },
  // 3. Atividades de financiamento
  {
    id: "financeiras",
    label: "Despesas financeiras (juros, tarifas, empréstimos)",
    atividade: "financiamento",
    tipo: "saida",
    prefixos: ["08003010", "07002"],
  },
  {
    id: "distribuicao-lucros",
    label: "Participações e distribuição de lucros",
    atividade: "financiamento",
    tipo: "saida",
    prefixos: ["08005"],
  },
];

/**
 * Grupos da DRE que não são saída de caixa e ficam fora da DFC
 * (perda de mercadoria já está no custo/estoque).
 */
export const PREFIXOS_FORA_DA_DFC = ["08003011"];

export const ATIVIDADES: { id: AtividadeDfc; label: string }[] = [
  { id: "operacional", label: "1. Fluxo de Caixa das Atividades Operacionais" },
  { id: "investimento", label: "2. Fluxo de Caixa das Atividades de Investimento" },
  { id: "financiamento", label: "3. Fluxo de Caixa das Atividades de Financiamento" },
];

export const DFC_CONFIG = {
  /** Meses buscados até o mês escolhido (12 do gráfico + comparação com o ano anterior e acumulado). */
  mesesHistorico: 24,
  /** Movimentações relevantes: quantas trazer e quantas mostrar no card. */
  movimentacoes: 50,
  movimentacoesNoCard: 6,
} as const;
