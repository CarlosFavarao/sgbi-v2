/**
 * Acesso a telas e cards (D46). Um card fica desabilitado quando:
 * - a **plataforma** do cliente (VX, Cloud ou Fivewin) não envia ao banco do BI
 *   alguma fonte de dados que ele usa (mostrar zeros ou vazio pareceria dado
 *   real, ver "Não invente dados"); ou
 * - o **usuário** não tem permissão para vê-lo (regras ainda em decisão, P59:
 *   hoje ninguém é restringido).
 * Funções puras, usadas no cliente (cards, menu, consultas) e no servidor
 * (`src/server/acesso.ts`, rotas da API).
 */

export const PLATAFORMAS = { vx: "VX", cloud: "Cloud", fivewin: "Fivewin" } as const;
export type Plataforma = keyof typeof PLATAFORMAS;

/** Fontes de dados do banco do BI, com o nome mostrado ao usuário. */
export const FONTES = {
  venda: "venda e custo por produto",
  compra: "compras",
  pdv: "cupons do PDV",
  cancelamentos: "cancelamentos",
  despesas: "despesas",
  metas: "metas de venda",
  "contas-pagar": "contas a pagar",
  "contas-receber": "contas a receber",
  cartoes: "vendas em cartão",
} as const;
export type Fonte = keyof typeof FONTES;

/**
 * Fontes que cada plataforma **não** envia ao banco do BI. O VX é a referência
 * (recebe as novidades primeiro). Provisório: o Fivewin repete os bloqueios do
 * BI antigo (`src/utils/SystemAccess.ts`: financeiro, despesas, cartões, metas e
 * compras) e o Cloud não tem bloqueio lá; a documentação de cada plataforma
 * está pendente (P61). Ao documentar, ajuste só esta tabela.
 */
export const FONTES_AUSENTES: Record<Plataforma, readonly Fonte[]> = {
  vx: [],
  cloud: [],
  fivewin: ["compra", "despesas", "metas", "contas-pagar", "contas-receber", "cartoes"],
};

/**
 * Telas e as fontes sem as quais a tela inteira não faz sentido (sem elas, a
 * tela mostra só o aviso e o item do menu fica desabilitado). Os cards podem
 * exigir mais fontes (`FONTES` do `layout.ts` de cada tela).
 */
export const TELAS = {
  "painel-executivo": { rotulo: "Painel Executivo", fontes: ["venda"] },
  vendas: { rotulo: "Vendas", fontes: ["venda"] },
  metas: { rotulo: "Metas", fontes: ["metas", "venda"] },
  financeiro: { rotulo: "Fluxo de Caixa", fontes: ["contas-pagar", "contas-receber", "cartoes"] },
  dfc: { rotulo: "DFC", fontes: [] },
} as const satisfies Record<string, { rotulo: string; fontes: readonly Fonte[] }>;
export type Tela = keyof typeof TELAS;

/**
 * O que o usuário logado pode ver. `permitidos` = chaves liberadas (`tela`,
 * `tela:card` ou `tela:bloco:item`), ou `null` para sem restrição (enquanto as
 * permissões não forem decididas, P59, é sempre `null`).
 */
export type Acesso = { plataforma: Plataforma; permitidos: readonly string[] | null };

export type Bloqueio = { motivo: "plataforma"; plataforma: Plataforma; fontes: Fonte[] } | { motivo: "permissao" };

/** `sistema` do login do VX → plataforma; vazio ou desconhecido = VX, como no BI antigo. */
export function normalizarPlataforma(sistema: unknown): Plataforma {
  const valor = typeof sistema === "string" ? sistema.trim().toUpperCase() : "";
  if (valor === "FIVEWIN") return "fivewin";
  if (valor === "CLOUD") return "cloud";
  return "vx";
}

export function fontesAusentes(plataforma: Plataforma, fontes: readonly Fonte[]): Fonte[] {
  const ausentes = FONTES_AUSENTES[plataforma];
  return fontes.filter((f) => ausentes.includes(f));
}

/**
 * Chave liberada por `permitidos`: ela mesma, um "pai" dela (liberar a tela
 * libera os cards) ou um "filho" (liberar um KPI libera o bloco e a tela que o
 * contêm, para ele aparecer).
 */
export function permitido(permitidos: readonly string[] | null, chave: string): boolean {
  if (permitidos === null) return true;
  return permitidos.some((p) => p === chave || chave.startsWith(`${p}:`) || p.startsWith(`${chave}:`));
}

/** Por que a chave está bloqueada (a falta de dados da plataforma vem antes da permissão), ou `null`. */
export function bloqueio(acesso: Acesso, chave: string, fontes: readonly Fonte[] = []): Bloqueio | null {
  const ausentes = fontesAusentes(acesso.plataforma, fontes);
  if (ausentes.length) return { motivo: "plataforma", plataforma: acesso.plataforma, fontes: ausentes };
  if (!permitido(acesso.permitidos, chave)) return { motivo: "permissao" };
  return null;
}

export const bloqueioDaTela = (acesso: Acesso, tela: Tela) => bloqueio(acesso, tela, TELAS[tela].fontes);

/** Só a plataforma (para habilitar consultas: a permissão por card esconde o card, e a rota checa de novo). */
export const temFontes = (acesso: Acesso, fontes: readonly Fonte[]) =>
  fontesAusentes(acesso.plataforma, fontes).length === 0;

/** "contas a pagar, contas a receber e vendas em cartão". */
export function listaDeFontes(fontes: readonly Fonte[]): string {
  const nomes = fontes.map((f) => FONTES[f]);
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/** Texto curto do bloqueio, para cards e menu. */
export function tituloDoBloqueio(b: Bloqueio): string {
  return b.motivo === "plataforma" ? `Indisponível no ${PLATAFORMAS[b.plataforma]}` : "Sem permissão";
}

export function detalheDoBloqueio(b: Bloqueio): string {
  return b.motivo === "plataforma"
    ? `O ${PLATAFORMAS[b.plataforma]} ainda não envia ao banco do BI: ${listaDeFontes(b.fontes)}.`
    : "Seu usuário não tem acesso a este conteúdo.";
}
