"use client";

import { mdiArrowBottomRight, mdiArrowTopRight, mdiChartBar, mdiDatabaseOutline, mdiSafe } from "@mdi/js";
import { Delta, KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { variacao } from "@/lib/calc";
import { formatMoeda } from "@/lib/format";
import type { Dfc } from "../compute";

function Comparacao({
  atual,
  anterior,
  maiorMelhor,
  rotulo,
}: {
  atual: number;
  anterior: number | undefined;
  maiorMelhor: boolean;
  rotulo: string;
}) {
  if (anterior == null) return null;
  return (
    <>
      <Delta value={variacao(atual, anterior)} unidade="%" maiorMelhor={maiorMelhor} />
      <span className="whitespace-nowrap tabular-nums">
        vs {formatMoeda(anterior)} ({rotulo})
      </span>
    </>
  );
}

/** Cinco KPIs do print: saldos inicial e final dependem do saldo bancário (P42). */
export function KpisDfc({
  atual,
  anterior,
  rotuloComparacao,
  carregando,
}: {
  atual: Dfc;
  anterior: Dfc | null;
  rotuloComparacao: string;
  carregando: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        titulo="Saldo Inicial de Caixa"
        ajuda="Saldo de caixa e equivalentes no início do mês. O banco do SGBI não tem saldos bancários (P42)."
        icone={mdiDatabaseOutline}
        tom="blue"
        valor={<SemDados>Saldo bancário não integrado</SemDados>}
      />
      <KpiCard
        titulo="Entradas de Caixa"
        ajuda="Receita bruta (vendas PDV e faturadas) e outros recebimentos da DRE do mês (regime de competência, P51)."
        icone={mdiArrowTopRight}
        tom="green"
        carregando={carregando}
        valor={formatMoeda(atual.entradas)}
        linhas={
          <Comparacao atual={atual.entradas} anterior={anterior?.entradas} maiorMelhor rotulo={rotuloComparacao} />
        }
      />
      <KpiCard
        titulo="Saídas de Caixa"
        ajuda="CMV, despesas, impostos, deduções, investimentos e despesas financeiras da DRE do mês (P51)."
        icone={mdiArrowBottomRight}
        tom="coral"
        carregando={carregando}
        valor={formatMoeda(atual.saidas)}
        linhas={
          <Comparacao atual={atual.saidas} anterior={anterior?.saidas} maiorMelhor={false} rotulo={rotuloComparacao} />
        }
      />
      <KpiCard
        titulo="Geração Líquida de Caixa"
        ajuda="Entradas menos saídas das três atividades (operacional, investimento e financiamento)."
        icone={mdiChartBar}
        tom="teal"
        carregando={carregando}
        valor={formatMoeda(atual.geracao)}
        linhas={<Comparacao atual={atual.geracao} anterior={anterior?.geracao} maiorMelhor rotulo={rotuloComparacao} />}
      />
      <KpiCard
        titulo="Saldo Final de Caixa"
        ajuda="Saldo inicial + geração líquida. Depende do saldo bancário (P42)."
        icone={mdiSafe}
        tom="purple"
        valor={<SemDados>Depende do saldo inicial</SemDados>}
      />
    </div>
  );
}
