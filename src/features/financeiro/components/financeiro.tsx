"use client";

import Icon from "@mdi/react";
import { mdiDatabaseClockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useAvisos, type Aviso } from "@/components/avisos";
import { FiliaisSelect } from "@/components/filtros/filiais-select";
import { Field } from "@/components/ui/field";
import { ResizableRow } from "@/components/ui/resizable-row";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { addDays, firstDayOfMonth, lastDayOfMonth, mesesDoPeriodo, resolverAtalhoComparacao } from "@/lib/date";
import { formatData, formatMesAno } from "@/lib/format";
import { evolucaoDoMes, fluxoPrevisto, porCategoria, porDia, porMes, realizadoNoPeriodo, vencidos } from "../compute";
import { FINANCEIRO_CONFIG } from "../config";
import { financeiroQueries } from "../queries";
import type { FiltrosFinanceiro } from "../types";
import { CategoriasCard } from "./categorias-card";
import { CompromissosCard } from "./compromissos-card";
import { EvolucaoMensalChart, IndicadoresCard, SaldoContasCard } from "./cards-inferiores";
import { EvolucaoCaixaChart } from "./evolucao-caixa-chart";
import { FluxoPrevistoTable } from "./fluxo-previsto-table";
import { KpisFinanceiro } from "./kpis-financeiro";

type FiltrosEstado = { mes: string | null; filiais: number[] | null };

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean; fetchStatus: string }) =>
  (q.isPending && q.fetchStatus !== "idle") || q.isPlaceholderData;
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

/** Mês (YYYY-MM) `n` meses antes. */
function mesesAntes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

export function Financeiro() {
  const filiaisQuery = useQuery(financeiroQueries.filiais());
  const dataMaxima = filiaisQuery.data?.dataMaxima ?? null;
  const [estado, setEstado] = useState<FiltrosEstado>({ mes: null, filiais: null });

  const filtros: FiltrosFinanceiro = {
    // null = mês do último dia com venda (resolvido quando as filiais chegam).
    mes: estado.mes ?? dataMaxima?.slice(0, 7) ?? "",
    filiais: estado.filiais ?? filiaisQuery.data?.filiais.map((f) => f.codigo) ?? [],
  };

  // Referência ("hoje"): último dia com venda, limitado ao mês escolhido (como em Metas).
  const inicioMes = filtros.mes ? `${filtros.mes}-01` : null;
  const referencia = inicioMes && dataMaxima ? min(lastDayOfMonth(inicioMes), dataMaxima) : null;
  const mes = inicioMes ? { inicio: inicioMes, fim: lastDayOfMonth(inicioMes) } : null;
  const decorrido = mes && referencia && referencia >= mes.inicio ? { inicio: mes.inicio, fim: referencia } : null;
  const decorridoAnterior = decorrido ? resolverAtalhoComparacao(decorrido, "mes-anterior") : null;
  const dias = FINANCEIRO_CONFIG.diasPrevistos;

  // Janela diária: do início do mês anterior até o fim do mês ou os próximos 30 dias.
  const janela =
    mes && referencia
      ? { inicio: firstDayOfMonth(addDays(mes.inicio, -1)), fim: max(mes.fim, addDays(referencia, dias)) }
      : null;
  const doze = filtros.mes ? { inicio: `${mesesAntes(filtros.mes, 11)}-01`, fim: mes!.fim } : null;

  const movimentos = useQuery(financeiroQueries.movimentos(filtros, janela, referencia));
  const movimentosAno = useQuery(financeiroQueries.movimentos(filtros, doze, referencia));
  const compromissos = useQuery(financeiroQueries.compromissos(filtros, referencia, dias));
  const prazos = useQuery(
    financeiroQueries.prazos(
      filtros,
      referencia ? { inicio: addDays(referencia, -(FINANCEIRO_CONFIG.diasPrazos - 1)), fim: referencia } : null,
    ),
  );

  const lista = movimentos.data?.movimentos ?? [];
  const pendente = carregando(movimentos);
  const listasRef = useRef<HTMLDivElement>(null);

  const erro = [filiaisQuery, movimentos, movimentosAno, compromissos, prazos].find((q) => q.isError);
  const avisos: Aviso[] = [];
  if (erro) {
    avisos.push({
      id: "erro-carregamento",
      nivel: "erro",
      titulo: "Não foi possível carregar parte dos dados",
      detalhes: [erro.error?.message ?? "Erro desconhecido."],
      acao: { label: "Tentar novamente", onClick: () => void erro.refetch() },
    });
  }
  avisos.push({
    id: "fontes-financeiro",
    nivel: "atencao",
    titulo: "Fluxo de caixa parcial: faltam fontes de dados",
    detalhes: [
      "Saldos bancários e contas não estão no banco do SGBI: saldo em caixa, dias de cobertura e saldo por conta ficam indisponíveis.",
      "Vendas em dinheiro e Pix só existem na API do VX: as entradas trazem cartões (pela liquidação) e contas a receber.",
    ],
  });
  useAvisos("financeiro", avisos);

  const meses =
    filiaisQuery.data?.dataMinima && dataMaxima
      ? mesesDoPeriodo({ inicio: filiaisQuery.data.dataMinima, fim: dataMaxima }).reverse()
      : [];

  const cabecalho = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Financeiro <span className="text-base font-medium text-muted-foreground">· Fluxo de Caixa</span>
          </h1>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Icon path={mdiDatabaseClockOutline} size={0.6} aria-hidden />
            {referencia ? `Referência ${formatData(referencia)}` : "Carregando…"}
          </p>
        </div>
      </div>
      {filiaisQuery.data && filtros.mes ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Mês de referência">
            <Select
              aria-label="Mês de referência"
              className="w-40"
              value={filtros.mes}
              options={[...new Set([...meses, filtros.mes])].map((m) => ({ value: m, label: formatMesAno(m) }))}
              onValueChange={(m) => setEstado((e) => ({ ...e, mes: m }))}
            />
          </Field>
          <Field label="Filial">
            <FiliaisSelect
              filiais={filiaisQuery.data.filiais}
              value={filtros.filiais}
              onChange={(value) => setEstado((e) => ({ ...e, filiais: value }))}
            />
          </Field>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-5 text-primary" />
          Carregando filtros…
        </div>
      )}
    </div>
  );

  if (!referencia || !mes || !decorrido || !decorridoAnterior) {
    return (
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
        {cabecalho}
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-5 text-primary" />
          Carregando…
        </div>
      </div>
    );
  }

  const atual = realizadoNoPeriodo(lista, decorrido);
  const anterior = realizadoNoPeriodo(lista, decorridoAnterior);
  const diasDoMes = porDia(lista, decorrido);
  const previsto = fluxoPrevisto(lista, referencia, dias, "dia");
  const menor = previsto.reduce<{ valor: number; data: string } | null>(
    (m, l) => (!m || l.acumulado < m.valor ? { valor: l.acumulado, data: l.inicio } : m),
    null,
  );
  const abertos = vencidos(lista);
  const limite = FINANCEIRO_CONFIG.categoriasNoGrafico;

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      {cabecalho}

      <KpisFinanceiro
        atual={atual}
        anterior={anterior}
        menorSaldo={menor}
        series={{
          entradas: diasDoMes.map((d) => ({ data: d.data, valor: d.entradas })),
          saidas: diasDoMes.map((d) => ({ data: d.data, valor: d.saidas })),
          resultado: diasDoMes.map((d) => ({ data: d.data, valor: d.entradas - d.saidas })),
        }}
        carregando={pendente}
      />

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[3fr_2fr]">
        <EvolucaoCaixaChart
          mes={filtros.mes}
          referencia={referencia}
          pontos={evolucaoDoMes(lista, mes, referencia)}
          carregando={pendente}
        />
        <CategoriasCard
          entradas={porCategoria(lista, decorrido, "entrada", limite)}
          saidas={porCategoria(lista, decorrido, "saida", limite)}
          carregando={pendente}
        />
      </div>

      <ResizableRow
        storageKey="sgbi:financeiro:linha-previsto"
        larguraInicial={55}
        abaixo={listasRef}
        alturaMinima={200}
        esquerda={<FluxoPrevistoTable movimentos={lista} referencia={referencia} dias={dias} carregando={pendente} />}
        direita={
          <CompromissosCard
            compromissos={compromissos.data?.compromissos ?? []}
            carregando={carregando(compromissos)}
          />
        }
      />

      <div ref={listasRef} className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr]">
        <SaldoContasCard />
        <EvolucaoMensalChart
          pontos={porMes(
            movimentosAno.data?.movimentos ?? [],
            mesesDoPeriodo({ inicio: doze!.inicio, fim: doze!.fim }),
          )}
          carregando={carregando(movimentosAno)}
        />
        <IndicadoresCard
          indicadores={{
            prazoCartoes: prazos.data?.recebimentoCartoes ?? null,
            prazoClientes: prazos.data?.recebimentoClientes ?? null,
            prazoPagamento: prazos.data?.pagamento ?? null,
            vencidoReceber: abertos.receber,
            vencidoPagar: abertos.pagar,
            previstoEntradas: previsto.reduce((t, l) => t + l.entradas, 0),
            previstoSaidas: previsto.reduce((t, l) => t + l.saidas, 0),
          }}
          carregando={pendente || carregando(prazos)}
        />
      </div>
    </div>
  );
}
