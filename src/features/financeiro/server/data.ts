import "server-only";

import { and, between, eq, gt, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { cartoesEmpresas, cartoesVendas, contasPagar, contasReceber, fornecedores } from "@/db/schema";
import { addDays } from "@/lib/date";
import type { Compromisso, Movimento, Periodo, PrazosResponse, SituacaoMovimento } from "../types";

// Dados D-1 (carga noturna): cache de horas, invalidável pela tag.
const CACHE_TAG = "financeiro";

const sum = (column: AnyColumn | SQL) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
/** Datas vazias do VX chegam como 0000-00-00. */
const preenchida = (column: AnyColumn) => gt(column, "1900-01-01");

/** Valor de um título pago (o total pago; sem ele, o valor do título + taxa do boleto). */
const valorPago = sql`coalesce(nullif(${contasPagar.valorTotalPagamento}, 0), ${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0))`;
const valorAPagar = sql`${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0)`;

/** Categoria de saída: "D" = despesa (P45); o resto, compra de mercadoria. */
const categoriaPagar = sql<string>`case when ${contasPagar.classificacaoProduto} = 'D' then 'Despesas' else 'Fornecedores (mercadoria)' end`;
const CATEGORIA_RECEBER = "Clientes (contas a receber)";

// Sem texto acentuado no SQL: a tabela é latin1 e o literal viria em utf8mb4 (mistura de collations).
const empresa = {
  descricao: sql<string | null>`trim(${cartoesEmpresas.descricaoEmpresa})`,
  codigo: cartoesVendas.codigoEmpresa,
};
const nomeEmpresa = (e: { descricao: string | null; codigo: number | null }) => e.descricao || `Cartão ${e.codigo}`;

function situacaoEmAberto(vencimento: string, referencia: string): SituacaoMovimento {
  return vencimento <= referencia ? "vencido" : "previsto";
}

/**
 * Movimentos de caixa por dia e categoria no intervalo:
 * - cartões: valor líquido no vencimento (liquidação); até a referência conta como realizado (P43);
 * - contas a receber e a pagar: realizadas na data do recebimento/pagamento (se até a referência),
 *   em aberto no vencimento.
 */
export async function getMovimentos(periodo: Periodo, referencia: string, lojas: number[]): Promise<Movimento[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const { inicio, fim } = periodo;
  const [cartoes, receber, pagar] = await Promise.all([
    db
      .select({ data: cartoesVendas.dataVencimento, ...empresa, valor: sum(cartoesVendas.valorLiquido) })
      .from(cartoesVendas)
      .leftJoin(cartoesEmpresas, eq(cartoesEmpresas.codigoEmpresa, cartoesVendas.codigoEmpresa))
      .where(and(inArray(cartoesVendas.codigoFilial, lojas), between(cartoesVendas.dataVencimento, inicio, fim)))
      .groupBy(cartoesVendas.dataVencimento, cartoesVendas.codigoEmpresa),
    // Tabelas pequenas: traz cada título e decide a situação pela referência.
    db
      .select({
        vencimento: contasReceber.dataVencimento,
        recebimento: contasReceber.dataRecebimento,
        valorDocumento: contasReceber.valorDocumento,
        valorRecebido: contasReceber.valorRecebido,
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
        pagamento: contasPagar.dataPagamento,
        categoria: categoriaPagar,
        pago: sql<number>`${valorPago}`.mapWith(Number),
        aPagar: sql<number>`${valorAPagar}`.mapWith(Number),
      })
      .from(contasPagar)
      .where(
        and(
          inArray(contasPagar.codigoFilial, lojas),
          sql`(${contasPagar.dataVencimento} between ${inicio} and ${fim} or ${contasPagar.dataPagamento} between ${inicio} and ${fim})`,
        ),
      ),
  ]);

  const movimentos: Movimento[] = [];
  const dentro = (data: string | null) => !!data && data > "1900-01-01" && data >= inicio && data <= fim;

  for (const c of cartoes) {
    if (!dentro(c.data)) continue;
    movimentos.push({
      data: c.data!,
      tipo: "entrada",
      fonte: "cartao",
      categoria: nomeEmpresa(c),
      situacao: c.data! <= referencia ? "realizado" : "previsto",
      valor: c.valor,
    });
  }

  for (const r of receber) {
    // Recebido até a referência: realizado no dia do recebimento; senão, em aberto no vencimento.
    const recebido = dentro(r.recebimento) && r.recebimento! <= referencia;
    if (recebido) {
      movimentos.push({
        data: r.recebimento!,
        tipo: "entrada",
        fonte: "receber",
        categoria: CATEGORIA_RECEBER,
        situacao: "realizado",
        valor: r.valorRecebido ?? 0,
      });
    } else if (dentro(r.vencimento)) {
      movimentos.push({
        data: r.vencimento!,
        tipo: "entrada",
        fonte: "receber",
        categoria: CATEGORIA_RECEBER,
        situacao: situacaoEmAberto(r.vencimento!, referencia),
        valor: r.valorDocumento ?? 0,
      });
    }
  }

  for (const p of pagar) {
    const pago = dentro(p.pagamento) && p.pagamento! <= referencia;
    if (pago) {
      movimentos.push({
        data: p.pagamento!,
        tipo: "saida",
        fonte: "pagar",
        categoria: p.categoria,
        situacao: "realizado",
        valor: p.pago,
      });
    } else if (dentro(p.vencimento)) {
      movimentos.push({
        data: p.vencimento!,
        tipo: "saida",
        fonte: "pagar",
        categoria: p.categoria,
        situacao: situacaoEmAberto(p.vencimento!, referencia),
        valor: p.aPagar,
      });
    }
  }

  return movimentos;
}

/**
 * Compromissos dos próximos dias e títulos vencidos em aberto (até 60 dias antes da referência).
 * Os cartões de um dia são agrupados por empresa (são milhares de parcelas).
 */
export async function getCompromissos(referencia: string, dias: number, lojas: number[]): Promise<Compromisso[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const ate = addDays(referencia, dias);
  const desde = addDays(referencia, -60);
  const [cartoes, receber, pagar] = await Promise.all([
    db
      .select({ data: cartoesVendas.dataVencimento, ...empresa, valor: sum(cartoesVendas.valorLiquido) })
      .from(cartoesVendas)
      .leftJoin(cartoesEmpresas, eq(cartoesEmpresas.codigoEmpresa, cartoesVendas.codigoEmpresa))
      .where(
        and(
          inArray(cartoesVendas.codigoFilial, lojas),
          between(cartoesVendas.dataVencimento, addDays(referencia, 1), ate),
        ),
      )
      .groupBy(cartoesVendas.dataVencimento, cartoesVendas.codigoEmpresa),
    db
      .select({
        data: contasReceber.dataVencimento,
        descricao: sql<string>`coalesce(nullif(trim(${contasReceber.nomeCliente}), ''), 'Cliente sem nome')`,
        valor: sql<number>`coalesce(${contasReceber.valorDocumento}, 0)`.mapWith(Number),
        recebimento: contasReceber.dataRecebimento,
      })
      .from(contasReceber)
      .where(and(inArray(contasReceber.codigoFilial, lojas), between(contasReceber.dataVencimento, desde, ate))),
    db
      .select({
        data: contasPagar.dataVencimento,
        descricao: sql<string>`coalesce(nullif(trim(${contasPagar.nome}), ''), nullif(trim(${fornecedores.nomeFantasia}), ''), nullif(trim(${fornecedores.razaoSocial}), ''), nullif(trim(${contasPagar.observacao}), ''), ${categoriaPagar})`,
        valor: sql<number>`${valorAPagar}`.mapWith(Number),
        pagamento: contasPagar.dataPagamento,
      })
      .from(contasPagar)
      .leftJoin(fornecedores, eq(fornecedores.codigo, contasPagar.codigoFornecedor))
      .where(and(inArray(contasPagar.codigoFilial, lojas), between(contasPagar.dataVencimento, desde, ate))),
  ]);

  // Em aberto na referência: sem baixa, ou baixado depois dela.
  const emAberto = (baixa: string | null) => !baixa || baixa <= "1900-01-01" || baixa > referencia;
  const lista: Compromisso[] = [
    ...cartoes.map((c) => ({
      data: c.data!,
      tipo: "entrada" as const,
      fonte: "cartao" as const,
      descricao: `Cartão · ${nomeEmpresa(c)}`,
      valor: c.valor,
      situacao: "previsto" as const,
    })),
    ...receber
      .filter((r) => emAberto(r.recebimento))
      .map((r) => ({
        data: r.data!,
        tipo: "entrada" as const,
        fonte: "receber" as const,
        descricao: r.descricao,
        valor: r.valor,
        situacao: situacaoEmAberto(r.data!, referencia) as "previsto" | "vencido",
      })),
    ...pagar
      .filter((p) => emAberto(p.pagamento))
      .map((p) => ({
        data: p.data!,
        tipo: "saida" as const,
        fonte: "pagar" as const,
        descricao: p.descricao,
        valor: p.valor,
        situacao: situacaoEmAberto(p.data!, referencia) as "previsto" | "vencido",
      })),
  ];
  return lista.filter((c) => c.valor).sort((a, b) => a.data.localeCompare(b.data) || b.valor - a.valor);
}

/** Prazos médios (dias, ponderados pelo valor) dos títulos emitidos/vendidos no período. */
export async function getPrazos(periodo: Periodo, lojas: number[]): Promise<PrazosResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const media = (dias: SQL, valor: SQL | AnyColumn) =>
    sql<number | null>`sum(${dias} * ${valor}) / nullif(sum(${valor}), 0)`.mapWith((v) =>
      v == null ? null : Number(v),
    );

  const [[cartoes], [receber], [pagar]] = await Promise.all([
    db
      .select({
        dias: media(
          sql`datediff(${cartoesVendas.dataVencimento}, ${cartoesVendas.dataVenda})`,
          cartoesVendas.valorLiquido,
        ),
      })
      .from(cartoesVendas)
      .where(
        and(
          inArray(cartoesVendas.codigoFilial, lojas),
          between(cartoesVendas.dataVenda, periodo.inicio, periodo.fim),
          preenchida(cartoesVendas.dataVencimento),
        ),
      ),
    db
      .select({
        dias: media(
          sql`datediff(${contasReceber.dataVencimento}, ${contasReceber.dataEmissao})`,
          contasReceber.valorDocumento,
        ),
      })
      .from(contasReceber)
      .where(
        and(
          inArray(contasReceber.codigoFilial, lojas),
          between(contasReceber.dataEmissao, periodo.inicio, periodo.fim),
          preenchida(contasReceber.dataVencimento),
        ),
      ),
    db
      .select({
        dias: media(sql`datediff(${contasPagar.dataVencimento}, ${contasPagar.dataEmissao})`, contasPagar.valorPagar),
      })
      .from(contasPagar)
      .where(
        and(
          inArray(contasPagar.codigoFilial, lojas),
          between(contasPagar.dataEmissao, periodo.inicio, periodo.fim),
          preenchida(contasPagar.dataVencimento),
        ),
      ),
  ]);
  return {
    recebimentoCartoes: cartoes?.dias ?? null,
    recebimentoClientes: receber?.dias ?? null,
    pagamento: pagar?.dias ?? null,
  };
}
