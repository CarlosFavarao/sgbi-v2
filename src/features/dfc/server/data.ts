import "server-only";

import { and, between, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  cartoesEmpresas,
  cartoesVendas,
  contasPagar,
  contasReceber,
  filiais,
  fornecedores,
  viewDre,
} from "@/db/schema";
import type { Periodo } from "@/lib/filtros";
import type { LinhaDre, Movimentacao, OpcoesDfcResponse } from "../types";

// DRE mensal da carga noturna: cache de horas, invalidável pela tag.
const CACHE_TAG = "dfc";

const sum = (column: Parameters<typeof sql>[1]) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
const mesIso = sql<string>`date_format(${viewDre.periodo}, '%Y-%m')`;

/** Meses com DRE, último mês com receita e filiais com DRE. */
export async function getOpcoes(): Promise<OpcoesDfcResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [meses, lojas] = await Promise.all([
    db
      .select({ mes: mesIso, receita: sum(sql`case when ${viewDre.idGeral} = '01' then ${viewDre.valor} end`) })
      .from(viewDre)
      .groupBy(mesIso)
      .orderBy(mesIso),
    db
      .selectDistinct({ codigo: viewDre.filial, descricao: sql<string | null>`trim(${filiais.descricao})` })
      .from(viewDre)
      .leftJoin(filiais, eq(filiais.codigo, viewDre.filial))
      .orderBy(viewDre.filial),
  ]);
  const comReceita = meses.filter((m) => m.receita > 0);
  return {
    meses: meses.map((m) => m.mes),
    ultimoMesComReceita: comReceita.at(-1)?.mes ?? null,
    filiais: lojas.map((l) => ({ codigo: l.codigo!, descricao: l.descricao || `Filial ${l.codigo}` })),
  };
}

/**
 * Linhas da DRE por mês (soma das filiais): grupos (5 dígitos) das linhas
 * 01 a 07 e subgrupos (8) e itens (13) das despesas (08), que formam a DFC.
 */
export async function getDre(meses: { inicio: string; fim: string }, lojas: number[]): Promise<LinhaDre[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const linhas = await db
    .select({
      mes: mesIso,
      id: viewDre.idGeral,
      descricao: sql<string>`trim(${viewDre.descricao})`,
      valor: sum(viewDre.valor),
    })
    .from(viewDre)
    .where(
      and(
        inArray(viewDre.filial, lojas),
        between(viewDre.periodo, `${meses.inicio}-01`, `${meses.fim}-01`),
        sql`((${viewDre.idPrincipal} <> '08' and length(${viewDre.idGeral}) = 5) or (${viewDre.idPrincipal} = '08' and length(${viewDre.idGeral}) in (8, 13)))`,
      ),
    )
    .groupBy(mesIso, viewDre.idGeral, sql`trim(${viewDre.descricao})`);
  return linhas.map((l) => ({ ...l, id: l.id ?? "" })).filter((l) => l.valor !== 0);
}

const preenchida = (data: string | null) => !!data && data > "1900-01-01";

/**
 * Maiores movimentações do mês: cartões (por dia e empresa, no vencimento),
 * contas a receber e a pagar (na baixa, ou no vencimento se em aberto).
 */
export async function getMovimentacoes(periodo: Periodo, lojas: number[], limite: number): Promise<Movimentacao[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const { inicio, fim } = periodo;
  const [cartoes, receber, pagar] = await Promise.all([
    db
      .select({
        data: cartoesVendas.dataVencimento,
        // Sem texto acentuado no SQL: a tabela é latin1 (mistura de collations).
        empresa: sql<string | null>`trim(${cartoesEmpresas.descricaoEmpresa})`,
        codigo: cartoesVendas.codigoEmpresa,
        valor: sum(cartoesVendas.valorLiquido),
      })
      .from(cartoesVendas)
      .leftJoin(cartoesEmpresas, eq(cartoesEmpresas.codigoEmpresa, cartoesVendas.codigoEmpresa))
      .where(and(inArray(cartoesVendas.codigoFilial, lojas), between(cartoesVendas.dataVencimento, inicio, fim)))
      .groupBy(cartoesVendas.dataVencimento, cartoesVendas.codigoEmpresa),
    db
      .select({
        vencimento: contasReceber.dataVencimento,
        baixa: contasReceber.dataRecebimento,
        descricao: sql<string>`coalesce(nullif(trim(${contasReceber.nomeCliente}), ''), 'Cliente sem nome')`,
        aberto: sql<number>`coalesce(${contasReceber.valorDocumento}, 0)`.mapWith(Number),
        pago: sql<number>`coalesce(nullif(${contasReceber.valorRecebido}, 0), ${contasReceber.valorDocumento}, 0)`.mapWith(
          Number,
        ),
      })
      .from(contasReceber)
      .where(
        and(
          inArray(contasReceber.codigoFilial, lojas),
          sql`(${contasReceber.dataVencimento} between ${inicio} and ${fim} or ${contasReceber.dataRecebimento} between ${inicio} and ${fim})`,
        ),
      ),
    db
      .select({
        vencimento: contasPagar.dataVencimento,
        baixa: contasPagar.dataPagamento,
        descricao: sql<string>`coalesce(nullif(trim(${contasPagar.nome}), ''), nullif(trim(${fornecedores.nomeFantasia}), ''), nullif(trim(${fornecedores.razaoSocial}), ''), nullif(trim(${contasPagar.observacao}), ''), 'Pagamento')`,
        aberto: sql<number>`${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0)`.mapWith(Number),
        pago: sql<number>`coalesce(nullif(${contasPagar.valorTotalPagamento}, 0), ${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0))`.mapWith(
          Number,
        ),
      })
      .from(contasPagar)
      .leftJoin(fornecedores, eq(fornecedores.codigo, contasPagar.codigoFornecedor))
      .where(
        and(
          inArray(contasPagar.codigoFilial, lojas),
          sql`(${contasPagar.dataVencimento} between ${inicio} and ${fim} or ${contasPagar.dataPagamento} between ${inicio} and ${fim})`,
        ),
      ),
  ]);

  const dentro = (data: string | null) => preenchida(data) && data! >= inicio && data! <= fim;
  const titulo = (
    t: { vencimento: string | null; baixa: string | null; descricao: string; aberto: number; pago: number },
    tipo: Movimentacao["tipo"],
    origem: Movimentacao["origem"],
  ): Movimentacao | null => {
    if (dentro(t.baixa))
      return { data: t.baixa!, descricao: t.descricao, tipo, origem, situacao: "realizado", valor: t.pago };
    if (!preenchida(t.baixa) && dentro(t.vencimento)) {
      return { data: t.vencimento!, descricao: t.descricao, tipo, origem, situacao: "em-aberto", valor: t.aberto };
    }
    return null;
  };

  const lista: (Movimentacao | null)[] = [
    ...cartoes.map((c) =>
      dentro(c.data)
        ? {
            data: c.data!,
            descricao: `Recebimento de cartões · ${c.empresa || `Cartão ${c.codigo}`}`,
            tipo: "entrada" as const,
            origem: "Cartão" as const,
            situacao: "realizado" as const,
            valor: c.valor,
          }
        : null,
    ),
    ...receber.map((r) => titulo(r, "entrada", "Contas a receber")),
    ...pagar.map((p) => titulo(p, "saida", "Contas a pagar")),
  ];
  return lista
    .filter((m): m is Movimentacao => !!m && m.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}
