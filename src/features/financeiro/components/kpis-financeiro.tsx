"use client";

import type { ItemDoBloco } from "@/components/layout/bloco-kpis";
import {
  mdiAlertOutline,
  mdiArrowBottomRight,
  mdiArrowTopRight,
  mdiCalendarClock,
  mdiCashMultiple,
  mdiWalletOutline,
} from "@mdi/js";
import { corDoTom, Delta, KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { Sparkline } from "@/components/kpi/sparkline";
import { variacao } from "@/lib/calc";
import { formatData, formatMoeda } from "@/lib/format";

type Serie = { data: string; valor: number | null }[];
type Totais = { entradas: number; saidas: number; resultado: number };

function Vs({ valor }: { valor: number }) {
  return <span className="whitespace-nowrap tabular-nums">vs {formatMoeda(valor)} (mês ant.)</span>;
}

/** KPIs do Fluxo de Caixa (o `BlocoKpis` da grade personalizável monta a grade deles). */
export function kpisDoFinanceiro({
  atual,
  anterior,
  menorSaldo,
  series,
  carregando,
}: {
  atual: Totais;
  anterior: Totais | null;
  /** Menor acumulado previsto nos próximos dias (sem saldo inicial) e a data. */
  menorSaldo: { valor: number; data: string } | null;
  series: { entradas: Serie; saidas: Serie; resultado: Serie };
  carregando: boolean;
}): ItemDoBloco[] {
  const comparar = (chave: keyof Totais, maiorMelhor: boolean) =>
    anterior && (
      <>
        <Delta value={variacao(atual[chave], anterior[chave])} unidade="%" maiorMelhor={maiorMelhor} />
        <Vs valor={anterior[chave]} />
      </>
    );

  return [
    {
      id: "saldo",
      titulo: "Saldo em Caixa Hoje",
      node: (
        <KpiCard
          titulo="Saldo em Caixa Hoje"
          ajuda="Saldo das contas bancárias e do caixa. O banco do SGBI não tem saldos bancários (P42)."
          icone={mdiWalletOutline}
          tom="blue"
          valor={<SemDados>Saldo bancário não integrado</SemDados>}
        />
      ),
    },
    {
      id: "entradas",
      titulo: "Entradas do Período",
      node: (
        <KpiCard
          titulo="Entradas do Período"
          ajuda="Cartões liquidados (valor líquido no vencimento) e contas a receber recebidas, do início do mês até a referência. Vendas em dinheiro e Pix não estão no banco (P44)."
          icone={mdiArrowTopRight}
          tom="green"
          carregando={carregando}
          valor={formatMoeda(atual.entradas)}
          linhas={comparar("entradas", true)}
          grafico={
            <Sparkline
              label="Entradas"
              kind="bar"
              color={corDoTom("green")}
              format={formatMoeda}
              data={series.entradas}
            />
          }
        />
      ),
    },
    {
      id: "saidas",
      titulo: "Saídas do Período",
      node: (
        <KpiCard
          titulo="Saídas do Período"
          ajuda="Contas a pagar pagas do início do mês até a referência."
          icone={mdiArrowBottomRight}
          tom="coral"
          carregando={carregando}
          valor={formatMoeda(atual.saidas)}
          linhas={comparar("saidas", false)}
          grafico={
            <Sparkline label="Saídas" kind="bar" color={corDoTom("coral")} format={formatMoeda} data={series.saidas} />
          }
        />
      ),
    },
    {
      id: "resultado",
      titulo: "Resultado de Caixa",
      node: (
        <KpiCard
          titulo="Resultado de Caixa"
          ajuda="Entradas menos saídas realizadas no período."
          icone={mdiCashMultiple}
          tom="teal"
          carregando={carregando}
          valor={formatMoeda(atual.resultado)}
          linhas={comparar("resultado", true)}
          grafico={
            <Sparkline
              label="Resultado"
              kind="bar"
              color={corDoTom("teal")}
              format={formatMoeda}
              data={series.resultado}
            />
          }
        />
      ),
    },
    {
      id: "menor-saldo",
      titulo: "Menor Saldo Projetado",
      node: (
        <KpiCard
          titulo="Menor Saldo Projetado"
          ajuda="Menor valor do fluxo previsto acumulado nos próximos 30 dias, a partir de zero (sem o saldo bancário de hoje, P42)."
          icone={mdiAlertOutline}
          tom="orange"
          carregando={carregando}
          valor={menorSaldo ? formatMoeda(menorSaldo.valor) : <SemDados>Sem previsão</SemDados>}
          linhas={menorSaldo && <span>em {formatData(menorSaldo.data)} · sem saldo inicial</span>}
        />
      ),
    },
    {
      id: "cobertura",
      titulo: "Dias de Cobertura",
      node: (
        <KpiCard
          titulo="Dias de Cobertura"
          ajuda="Quantos dias o saldo de hoje cobre as saídas previstas. Depende do saldo bancário (P42)."
          icone={mdiCalendarClock}
          tom="purple"
          valor={<SemDados>Depende do saldo bancário</SemDados>}
        />
      ),
    },
  ];
}
