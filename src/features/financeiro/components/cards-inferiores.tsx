"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatDecimal, formatMesAno, formatMoeda, formatMoedaCompacta } from "@/lib/format";
import type { PontoMensal } from "../compute";
import { NaoIntegrado } from "./nao-integrado";

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

/** Entradas, saídas e resultado por mês (12 meses até o mês de referência). */
export function EvolucaoMensalChart({ pontos, carregando }: { pontos: PontoMensal[]; carregando: boolean }) {
  const temDados = pontos.some((p) => p.entradas || p.saidas);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="text-sm">Evolução das Entradas e Saídas · 12 meses</CardTitle>
          <ul className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success" />
              Entradas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-error" />
              Saídas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full bg-chart-1" />
              Resultado
            </li>
          </ul>
        </div>
      </CardHeader>
      <div className="relative h-36 px-1 pb-2 pt-1" aria-busy={carregando}>
        {!temDados ? (
          !carregando && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem movimento</div>
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="mes"
                tickFormatter={(m: string) => formatMesAno(m).replace("/20", "/")}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tickFormatter={formatMoedaCompacta}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={76}
              />
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
                maxBarSize={16}
                isAnimationActive={false}
              />
              <Bar
                dataKey="saidas"
                fill="var(--error)"
                radius={[3, 3, 0, 0]}
                maxBarSize={16}
                isAnimationActive={false}
              />
              <Line
                dataKey="resultado"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
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
