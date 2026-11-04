import { daysBetween, daysInMonth, lastDayOfMonth, mesesDoPeriodo } from "@/lib/date";
import type { MetaDia, Periodo } from "./types";

export type MetaMensal = { codigo: number; mes: string; meta: number; metaLucro: number };

const dias = (p: Periodo) => daysBetween(p.inicio, p.fim) + 1;

function intersecao(a: Periodo, b: Periodo): Periodo | null {
  const inicio = a.inicio > b.inicio ? a.inicio : b.inicio;
  const fim = a.fim < b.fim ? a.fim : b.fim;
  return inicio <= fim ? { inicio, fim } : null;
}

/** Soma da meta diária no período; null quando nenhum dia do período tem meta cadastrada. */
export function somaMetaDiaria(metas: MetaDia[], p: Periodo | null): { meta: number; metaLucro: number } | null {
  if (!p) return null;
  let meta = 0;
  let metaLucro = 0;
  let encontrou = false;
  for (const d of metas) {
    if (d.data < p.inicio || d.data > p.fim) continue;
    encontrou = true;
    meta += d.meta;
    metaLucro += d.metaLucro;
  }
  return encontrou ? { meta, metaLucro } : null;
}

/**
 * Fração da meta mensal que cabe em `p` dentro do mês: pela curva da meta diária
 * da loja (dias de maior venda pesam mais) ou, sem meta diária, pelos dias corridos.
 */
function fracaoDoMes(mes: string, p: Periodo, curvaLoja: MetaDia[]): number {
  const mesInteiro = { inicio: `${mes}-01`, fim: lastDayOfMonth(`${mes}-01`) };
  const parte = intersecao(mesInteiro, p);
  if (!parte) return 0;
  const doMes = somaMetaDiaria(curvaLoja, mesInteiro);
  if (doMes && doMes.meta > 0) return (somaMetaDiaria(curvaLoja, parte)?.meta ?? 0) / doMes.meta;
  return dias(parte) / daysInMonth(mesInteiro.inicio);
}

/**
 * Meta de um nível (departamento, grupo, subgrupo) em um período qualquer, a partir
 * das metas mensais (P33). null quando nenhum mês do período tem meta do código.
 */
export function metaNivelNoPeriodo(
  mensais: MetaMensal[],
  p: Periodo | null,
  curvaLoja: MetaDia[],
): { meta: number; metaLucro: number } | null {
  if (!p) return null;
  const meses = new Set(mesesDoPeriodo(p));
  let meta = 0;
  let metaLucro = 0;
  let encontrou = false;
  for (const m of mensais) {
    if (!meses.has(m.mes)) continue;
    encontrou = true;
    const fracao = fracaoDoMes(m.mes, p, curvaLoja);
    meta += m.meta * fracao;
    metaLucro += m.metaLucro * fracao;
  }
  return encontrou ? { meta, metaLucro } : null;
}

/**
 * Meta diária de um departamento: a meta mensal dele distribuída pela curva da
 * meta diária da loja (usada quando o filtro Departamento está ativo).
 */
export function metaDiariaDoNivel(mensais: MetaMensal[], curvaLoja: MetaDia[]): MetaDia[] {
  const porMes = new Map<string, { meta: number; metaLucro: number }>();
  for (const m of mensais) {
    const atual = porMes.get(m.mes) ?? { meta: 0, metaLucro: 0 };
    porMes.set(m.mes, { meta: atual.meta + m.meta, metaLucro: atual.metaLucro + m.metaLucro });
  }
  const resultado: MetaDia[] = [];
  for (const [mes, total] of porMes) {
    const mesInteiro = { inicio: `${mes}-01`, fim: lastDayOfMonth(`${mes}-01`) };
    const lojaMes = somaMetaDiaria(curvaLoja, mesInteiro)?.meta ?? 0;
    const qtd = daysInMonth(mesInteiro.inicio);
    for (let d = 1; d <= qtd; d++) {
      const data = `${mes}-${String(d).padStart(2, "0")}`;
      const lojaDia = curvaLoja.find((c) => c.data === data)?.meta ?? 0;
      const fracao = lojaMes > 0 ? lojaDia / lojaMes : 1 / qtd;
      resultado.push({ data, meta: total.meta * fracao, metaLucro: total.metaLucro * fracao });
    }
  }
  return resultado.sort((a, b) => a.data.localeCompare(b.data));
}
