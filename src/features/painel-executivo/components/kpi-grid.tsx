"use client";

import {
  mdiBullseyeArrow,
  mdiCartOutline,
  mdiCartRemove,
  mdiChartBar,
  mdiCubeOutline,
  mdiFinance,
  mdiOfficeBuildingOutline,
  mdiPercentOutline,
  mdiSackOutline,
  mdiTagOutline,
} from "@mdi/js";
import { diferencaPp, indicadores, percentual, serieDiaria, variacao, type Indicadores } from "../compute";
import { formatMoeda, formatPercentual } from "@/lib/format";
import type { Fonte, MetaResponse, ResumoResponse } from "../types";
import { corDoTom, Delta, KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { Sparkline } from "@/components/kpi/sparkline";

function Vs({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap tabular-nums">vs {children}</span>;
}

/** Variação + valor anterior, ou aviso quando o período de comparação não tem carga. */
function Comparativo({ temAnterior, children }: { temAnterior: boolean; children: React.ReactNode }) {
  return temAnterior ? children : <span>sem dados no período anterior</span>;
}

export function KpiGrid({
  resumo,
  meta,
  carregando,
}: {
  resumo: ResumoResponse | undefined;
  meta: MetaResponse | undefined;
  /** Fontes ainda carregando: cada card espera só as fontes que usa. */
  carregando: Record<Fonte | "meta", boolean>;
}) {
  const dias = resumo?.atual.dias ?? [];
  const a: Indicadores = indicadores(dias);
  const b: Indicadores = indicadores(resumo?.anterior.dias ?? []);
  const c = carregando;

  // Venda zerada (ex.: origem Faturamento sem notas) conta como "sem dados".
  const temVenda = a.cobertura.venda > 0 && a.venda !== 0;
  const temPdv = a.cobertura.vendaPdv > 0;
  const temDespesas = a.cobertura.despesas > 0;
  const temDespesasAnterior = b.cobertura.despesas > 0;
  const temVendaAnterior = b.cobertura.venda > 0 && b.venda !== 0;
  const temPdvAnterior = b.cobertura.tickets > 0;
  const temCancelAnterior = b.cobertura.cancelamentos > 0;

  const atingido = meta && meta.metaPeriodo ? percentual(a.venda, meta.metaPeriodo) : null;

  return (
    // Grade única 5 × 2: os dois grupos usam `contents` para fluir na mesma grade.
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div className="contents">
        <KpiCard
          titulo="Venda"
          ajuda="Soma da venda (PDV e/ou faturamento, conforme a Origem) no período."
          icone={mdiChartBar}
          tom="green"
          carregando={c.vendas}
          valor={temVenda ? formatMoeda(a.venda) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            temVenda && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                <Delta value={variacao(a.venda, b.venda)} unidade="%" maiorMelhor />
                <Vs>{formatMoeda(b.venda)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Venda"
              kind="bar"
              color={corDoTom("green")}
              format={formatMoeda}
              data={serieDiaria(dias, (i) => i.venda, "venda")}
            />
          }
        />
        <KpiCard
          titulo="Lucro Bruto"
          ajuda="Venda menos o custo da mercadoria vendida."
          icone={mdiSackOutline}
          tom="gold"
          carregando={c.vendas}
          valor={temVenda ? formatMoeda(a.lucro) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            temVenda && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                <Delta value={variacao(a.lucro, b.lucro)} unidade="%" maiorMelhor />
                <Vs>{formatMoeda(b.lucro)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Lucro Bruto"
              kind="bar"
              color={corDoTom("gold")}
              format={formatMoeda}
              data={serieDiaria(dias, (i) => i.lucro, "venda")}
            />
          }
        />
        <KpiCard
          titulo="Margem Bruta"
          ajuda="Lucro bruto dividido pela venda. Variação em pontos percentuais."
          icone={mdiPercentOutline}
          tom="pink"
          carregando={c.vendas}
          valor={a.margem != null ? formatPercentual(a.margem) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            a.margem != null && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                <Delta value={diferencaPp(a.margem, b.margem)} unidade="pp" maiorMelhor />
                <Vs>{formatPercentual(b.margem)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Margem Bruta"
              kind="area"
              color={corDoTom("pink")}
              format={formatPercentual}
              data={serieDiaria(dias, (i) => i.margem, "venda")}
            />
          }
        />
        <KpiCard
          titulo="Despesas Operacionais"
          ajuda="Soma das despesas lançadas no período (tabela despesa)."
          icone={mdiOfficeBuildingOutline}
          tom="blue"
          carregando={c.despesas || c.vendas}
          valor={temDespesas ? formatMoeda(a.despesas) : <SemDados>Sem despesas no período</SemDados>}
          linhas={
            temDespesas && (
              <>
                <span className="tabular-nums">{formatPercentual(a.despesasSobreVenda)} da venda</span>
                {temDespesasAnterior ? (
                  <Delta
                    value={diferencaPp(a.despesasSobreVenda, b.despesasSobreVenda)}
                    unidade="pp"
                    maiorMelhor={false}
                  />
                ) : (
                  <span>sem despesas no período anterior</span>
                )}
              </>
            )
          }
          grafico={
            <Sparkline
              label="Despesas Operacionais"
              kind="bar"
              color={corDoTom("blue")}
              format={formatMoeda}
              data={serieDiaria(dias, (i) => i.despesas, "despesas")}
            />
          }
        />
        <KpiCard
          titulo="Resultado Operacional"
          ajuda="Lucro bruto menos as despesas operacionais."
          icone={mdiFinance}
          tom="purple"
          carregando={c.vendas || c.despesas}
          valor={
            temVenda && temDespesas ? (
              formatMoeda(a.resultado)
            ) : (
              <SemDados>Sem despesas no período</SemDados>
            )
          }
          linhas={
            temVenda &&
            temDespesas && (
              <>
                <span className="tabular-nums">{formatPercentual(a.resultadoSobreVenda)} da venda</span>
                {temDespesasAnterior && temVendaAnterior ? (
                  <Delta value={variacao(a.resultado, b.resultado)} unidade="%" maiorMelhor />
                ) : (
                  <span>sem despesas no período anterior</span>
                )}
              </>
            )
          }
        />
        <KpiCard
          titulo="Venda vs Meta"
          ajuda="Venda do período dividida pela meta (previsão de venda por dia) do mesmo período."
          icone={mdiBullseyeArrow}
          tom="teal"
          carregando={c.meta || c.vendas}
          valor={
            atingido != null ? (
              formatMoeda(a.venda)
            ) : (
              <SemDados>Meta não cadastrada</SemDados>
            )
          }
          linhas={
            atingido != null &&
            meta && (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatPercentual(atingido)} da meta
                </span>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${Math.min(atingido, 100)}%` }}
                  />
                </div>
                <span className="tabular-nums">Meta: {formatMoeda(meta.metaPeriodo)}</span>
              </>
            )
          }
        />
      </div>

      <div className="contents">
        <KpiCard
          titulo="Ticket Médio"
          ajuda="Venda do PDV dividida pela quantidade de cupons (tabela parfil). Não usa o filtro de Origem."
          icone={mdiCartOutline}
          tom="orange"
          badge="PDV"
          carregando={c.pdv}
          valor={a.ticketMedio != null ? formatMoeda(a.ticketMedio) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            a.ticketMedio != null && (
              <>
                <Comparativo temAnterior={temPdvAnterior}>
                <Delta value={variacao(a.ticketMedio, b.ticketMedio)} unidade="%" maiorMelhor />
                <Vs>{formatMoeda(b.ticketMedio)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Ticket Médio"
              kind="area"
              color={corDoTom("orange")}
              format={formatMoeda}
              data={serieDiaria(dias, (i) => i.ticketMedio, "tickets")}
            />
          }
        />
        <KpiCard
          titulo="Compra sobre Venda"
          ajuda="Total comprado dividido pela venda do período. Quanto menor, melhor."
          icone={mdiCubeOutline}
          tom="blue"
          carregando={c.vendas}
          valor={
            a.compraSobreVenda != null ? (
              formatPercentual(a.compraSobreVenda)
            ) : (
              <SemDados>Sem dados no período</SemDados>
            )
          }
          linhas={
            a.compraSobreVenda != null && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                <Delta
                  value={diferencaPp(a.compraSobreVenda, b.compraSobreVenda)}
                  unidade="pp"
                  maiorMelhor={false}
                />
                <Vs>{formatPercentual(b.compraSobreVenda)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Compra sobre Venda"
              kind="area"
              color={corDoTom("blue")}
              format={formatPercentual}
              data={serieDiaria(dias, (i) => i.compraSobreVenda, "venda")}
            />
          }
        />
        <KpiCard
          titulo="Cancelamentos"
          ajuda="Valor cancelado no PDV (tabela cancelamentos), sobre a venda do PDV."
          icone={mdiCartRemove}
          tom="coral"
          badge="PDV"
          carregando={c.cancelamentos || c.pdv}
          valor={
            a.cobertura.cancelamentos ? (
              formatMoeda(a.cancelamentos)
            ) : (
              <SemDados>Sem dados no período</SemDados>
            )
          }
          linhas={
            a.cobertura.cancelamentos > 0 && (
              <>
                {temPdv && (
                  <span className="tabular-nums">
                    {formatPercentual(a.cancelamentosSobreVenda)} da venda PDV
                  </span>
                )}
                <Comparativo temAnterior={temCancelAnterior}>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <Delta value={variacao(a.cancelamentos, b.cancelamentos)} unidade="%" maiorMelhor={false} />
                    <Vs>{formatMoeda(b.cancelamentos)}</Vs>
                  </span>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Cancelamentos"
              kind="area"
              color={corDoTom("coral")}
              format={formatMoeda}
              data={serieDiaria(dias, (i) => i.cancelamentos, "cancelamentos")}
            />
          }
        />
        <KpiCard
          titulo="Descontos"
          ajuda="Cálculo em definição (decisão adiada): a soma de descontos no logpdv leva cerca de 34 s por mês."
          icone={mdiTagOutline}
          tom="gold"
          badge="PDV"
          valor={<SemDados>Em definição</SemDados>}
          linhas={<span>Venda bruta = venda + descontos</span>}
        />
      </div>
    </div>
  );
}
