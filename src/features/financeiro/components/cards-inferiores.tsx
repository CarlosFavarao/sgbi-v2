"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { propsEixoX, propsEixoY, propsGrade } from "@/components/charts/estilo";
import { ExpandirGrafico } from "@/components/charts/expandir-grafico";
import { LegendaGrafico, type ItemLegenda } from "@/components/charts/legenda-grafico";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatDecimal, formatMesAno, formatMoeda, formatMoedaCompacta } from "@/lib/format";
import type { PontoMensal } from "../compute";
import { NaoIntegrado } from "@/components/nao-integrado";

/** Saldo por conta bancária: sem fonte no banco do SGBI (P42). */
export function SaldoContasCard() {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">Saldo de Caixa por Conta</CardTitle>
      </CardHeader>
      <div className="h-44">
        <NaoIntegrado
          titulo="Saldos bancários não integrados"
          detalhe="O banco do SGBI não tem contas bancárias nem saldos. Ver pendência P42 em decisoes-e-pendencias.md."
        />
      </div>
    </Card>
  );
}

function MensalPlot({
  pontos,
  detalhado,
}: {
  pontos: PontoMensal[];
  /** Gráfico da janela ampliada: eixos e marcações mais detalhados. */
  detalhado: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid {...propsGrade(detalhado)} />
        <XAxis
          dataKey="mes"
          tickFormatter={(m: string) => (detalhado ? formatMesAno(m) : formatMesAno(m).replace("/20", "/"))}
          {...propsEixoX(detalhado)}
        />
        <YAxis tickFormatter={formatMoedaCompacta} {...propsEixoY(detalhado)} width={detalhado ? 92 : 76} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as PontoMensal | undefined;
            if (!active || !p) return null;
            return (
              <div className="min-w-44 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
                <div className="mb-1 font-semibold">{formatMesAno(p.mes)}</div>
                {(
                  [
                    ["Entradas", p.entradas, "text-success"],
                    ["Saídas", p.saidas, "text-error"],
                    ["Resultado", p.resultado, p.resultado >= 0 ? "text-success" : "text-error"],
                  ] as const
                ).map(([nome, v, cor]) => (
                  <div key={nome} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{nome}</span>
                    <span className={`font-semibold tabular-nums ${cor}`}>{formatMoeda(v)}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Bar
          dataKey="entradas"
          fill="var(--success)"
          radius={[3, 3, 0, 0]}
          maxBarSize={detalhado ? 30 : 16}
          isAnimationActive={false}
        />
        <Bar
          dataKey="saidas"
          fill="var(--error)"
          radius={[3, 3, 0, 0]}
          maxBarSize={detalhado ? 30 : 16}
          isAnimationActive={false}
        />
        <Line
          dataKey="resultado"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: detalhado ? 4 : 2.5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const TITULO_MENSAL = "Evolução das Entradas e Saídas · 12 meses";

const LEGENDA_MENSAL: ItemLegenda[] = [
  { nome: "Entradas", cor: "var(--success)" },
  { nome: "Saídas", cor: "var(--error)" },
  { nome: "Resultado", cor: "var(--chart-1)", forma: "linha" },
];

/** Entradas, saídas e resultado por mês (12 meses até o mês de referência). */
export function EvolucaoMensalChart({ pontos, carregando }: { pontos: PontoMensal[]; carregando: boolean }) {
  const temDados = pontos.some((p) => p.entradas || p.saidas);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="text-sm">{TITULO_MENSAL}</CardTitle>
          <LegendaGrafico itens={LEGENDA_MENSAL} />
        </div>
        <ExpandirGrafico
          titulo={TITULO_MENSAL}
          descricao="Entradas, saídas e resultado de cada um dos 12 meses até o mês de referência."
          legenda={<LegendaGrafico itens={LEGENDA_MENSAL} grande />}
          desabilitado={!temDados}
        >
          <MensalPlot pontos={pontos} detalhado />
        </ExpandirGrafico>
      </CardHeader>
      <div className="relative h-36 px-1 pb-2 pt-1" aria-busy={carregando}>
        {!temDados ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem movimento</div>
          )
        ) : (
          <MensalPlot pontos={pontos} detalhado={false} />
        )}
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}

export type Indicadores = {
  prazoCartoes: number | null;
  prazoClientes: number | null;
  prazoPagamento: number | null;
  vencidoReceber: number;
  vencidoPagar: number;
  previstoEntradas: number;
  previstoSaidas: number;
};

const dias = (v: number | null) => (v == null ? "—" : `${formatDecimal(v)} dias`);

/**
 * Indicadores calculáveis com os títulos. Ciclo de caixa, capital de giro e caixa
 * líquido dependem de estoque e saldo bancário (P48) e não aparecem.
 */
export function IndicadoresCard({ indicadores, carregando }: { indicadores: Indicadores; carregando: boolean }) {
  const i = indicadores;
  const linhas: [string, string, string, string?][] = [
    ["Prazo médio de recebimento (cartões)", dias(i.prazoCartoes), "Venda → liquidação, últimos 90 dias"],
    ["Prazo médio de recebimento (clientes)", dias(i.prazoClientes), "Emissão → vencimento"],
    ["Prazo médio de pagamento", dias(i.prazoPagamento), "Emissão → vencimento"],
    [
      "Contas a receber vencidas",
      formatMoeda(i.vencidoReceber),
      "Em aberto até a referência",
      i.vencidoReceber ? "text-warning" : "",
    ],
    [
      "Contas a pagar vencidas",
      formatMoeda(i.vencidoPagar),
      "Em aberto até a referência",
      i.vencidoPagar ? "text-error" : "",
    ],
    ["Entradas previstas (30 dias)", formatMoeda(i.previstoEntradas), "Cartões e contas a receber"],
    ["Saídas previstas (30 dias)", formatMoeda(i.previstoSaidas), "Contas a pagar"],
  ];
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">Indicadores de Caixa</CardTitle>
      </CardHeader>
      <div className="relative px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {linhas.map(([nome, valor, referencia, cor]) => (
                <tr key={nome} className="border-t first:border-t-0 hover:bg-secondary/50">
                  <td className="px-2 py-0.5" title={referencia}>
                    {nome}
                  </td>
                  <td className={`whitespace-nowrap px-2 py-0.5 text-right font-semibold tabular-nums ${cor ?? ""}`}>
                    {valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LoadingOverlay ativo={carregando} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
