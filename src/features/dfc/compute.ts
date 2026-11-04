import { ATIVIDADES, LINHAS_DFC, PREFIXOS_FORA_DA_DFC, type LinhaDfcConfig } from "./config";
import type { AtividadeDfc, LinhaDre } from "./types";

/** Folha da DFC: grupo da DRE (ou subgrupo de despesa) com os itens dele. */
export type FolhaDfc = {
  id: string;
  descricao: string;
  valor: number;
  itens: { id: string; descricao: string; valor: number }[];
};

export type LinhaDfc = { config: LinhaDfcConfig; valor: number; folhas: FolhaDfc[] };

export type AtividadeCalculada = {
  id: AtividadeDfc;
  label: string;
  entradas: number;
  saidas: number;
  /** Entradas − saídas. */
  liquido: number;
  linhas: LinhaDfc[];
};

export type Dfc = {
  atividades: AtividadeCalculada[];
  entradas: number;
  saidas: number;
  /** Geração líquida de caixa (1 + 2 + 3). */
  geracao: number;
  /** Valor das linhas da DRE deixadas fora da DFC (sem saída de caixa). */
  foraDaDfc: number;
};

/** Linha da DFC de um id da DRE: o prefixo mais longo vence; null = fora da DFC. */
function linhaDoId(id: string): LinhaDfcConfig | null {
  if (PREFIXOS_FORA_DA_DFC.some((p) => id.startsWith(p))) return null;
  let melhor: { linha: LinhaDfcConfig; tamanho: number } | null = null;
  for (const linha of LINHAS_DFC) {
    for (const p of linha.prefixos) {
      if (id.startsWith(p) && (!melhor || p.length > melhor.tamanho)) melhor = { linha, tamanho: p.length };
    }
  }
  return melhor?.linha ?? null;
}

const ehFolha = (id: string) => (id.startsWith("08") ? id.length === 8 : id.length === 5);

/** DFC de um conjunto de meses (um mês ou o acumulado do ano). */
export function montarDfc(linhas: LinhaDre[], meses: Set<string>): Dfc {
  const folhas = new Map<string, FolhaDfc & { linha: LinhaDfcConfig | null }>();
  const chave = (l: LinhaDre) => `${l.id}|${l.descricao}`;

  for (const l of linhas) {
    if (!meses.has(l.mes) || !ehFolha(l.id)) continue;
    const f = folhas.get(chave(l)) ?? { id: l.id, descricao: l.descricao, valor: 0, itens: [], linha: linhaDoId(l.id) };
    f.valor += l.valor;
    folhas.set(chave(l), f);
  }
  // Itens (13 dígitos) somados no subgrupo de despesa (8 dígitos) a que pertencem.
  const itens = new Map<string, Map<string, { id: string; descricao: string; valor: number }>>();
  for (const l of linhas) {
    if (!meses.has(l.mes) || l.id.length !== 13) continue;
    const doSubgrupo = itens.get(l.id.slice(0, 8)) ?? new Map();
    const item = doSubgrupo.get(chave(l)) ?? { id: l.id, descricao: l.descricao, valor: 0 };
    item.valor += l.valor;
    doSubgrupo.set(chave(l), item);
    itens.set(l.id.slice(0, 8), doSubgrupo);
  }

  let foraDaDfc = 0;
  const porLinha = new Map<string, FolhaDfc[]>();
  for (const f of folhas.values()) {
    if (!f.linha) {
      foraDaDfc += f.valor;
      continue;
    }
    const lista = porLinha.get(f.linha.id) ?? [];
    lista.push({
      id: f.id,
      descricao: f.descricao,
      valor: f.valor,
      itens: [...(itens.get(f.id)?.values() ?? [])].filter((i) => i.valor).sort((a, b) => b.valor - a.valor),
    });
    porLinha.set(f.linha.id, lista);
  }

  const atividades = ATIVIDADES.map(({ id, label }) => {
    const linhasDaAtividade = LINHAS_DFC.filter((c) => c.atividade === id).map((config) => {
      const fs = (porLinha.get(config.id) ?? []).sort((a, b) => b.valor - a.valor);
      return { config, valor: fs.reduce((t, f) => t + f.valor, 0), folhas: fs };
    });
    const entradas = linhasDaAtividade.filter((l) => l.config.tipo === "entrada").reduce((t, l) => t + l.valor, 0);
    const saidas = linhasDaAtividade.filter((l) => l.config.tipo === "saida").reduce((t, l) => t + l.valor, 0);
    return { id, label, entradas, saidas, liquido: entradas - saidas, linhas: linhasDaAtividade };
  });

  const entradas = atividades.reduce((t, a) => t + a.entradas, 0);
  const saidas = atividades.reduce((t, a) => t + a.saidas, 0);
  return { atividades, entradas, saidas, geracao: entradas - saidas, foraDaDfc };
}

/** Meses (YYYY-MM) de janeiro até o mês (acumulado do ano). */
export function mesesDoAno(mes: string): Set<string> {
  const [ano, m] = mes.split("-").map(Number);
  return new Set(Array.from({ length: m }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`));
}

/** Mês (YYYY-MM) `n` meses antes. */
export function mesesAntes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 - n, 1)).toISOString().slice(0, 7);
}

export type PontoGeracao = { mes: string; entradas: number; saidas: number; geracao: number };

/** Entradas, saídas e geração líquida dos 12 meses até o mês. */
export function evolucaoGeracao(linhas: LinhaDre[], mes: string): PontoGeracao[] {
  return Array.from({ length: 12 }, (_, i) => mesesAntes(mes, 11 - i)).map((m) => {
    const d = montarDfc(linhas, new Set([m]));
    return { mes: m, entradas: d.entradas, saidas: d.saidas, geracao: d.geracao };
  });
}
