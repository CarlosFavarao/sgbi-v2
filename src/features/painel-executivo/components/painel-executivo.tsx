"use client";

import Icon from "@mdi/react";
import { mdiAlertCircleOutline, mdiAlertOutline, mdiDatabaseClockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ResizableRow } from "@/components/ui/resizable-row";
import { Skeleton } from "@/components/ui/skeleton";
import { alertas as gerarAlertas, calcularLinha, indicadores, totais } from "../compute";
import { PERIODO_PADRAO } from "../config";
import { formatData, formatMoedaCompacta, formatMoeda, formatPercentual } from "../format";
import { painelQueries } from "../queries";
import type { Filtros } from "../types";
import { AlertasList } from "./alertas-list";
import { DepartamentosTable } from "./departamentos-table";
import { EvolucaoChart } from "./evolucao-chart";
import { FiltrosBar } from "./filtros-bar";
import { KpiGrid } from "./kpi-grid";
import { MetaAcumulado } from "./meta-acumulado";

type FiltrosEstado = Omit<Filtros, "filiais"> & { filiais: number[] | null };

export function PainelExecutivo() {
  const filiaisQuery = useQuery(painelQueries.filiais());
  const [estado, setEstado] = useState<FiltrosEstado>({
    periodo: PERIODO_PADRAO,
    comparacao: "periodo-anterior",
    // null = todas as filiais com movimento (resolvido quando a lista chega).
    filiais: null,
    origem: "todos",
  });

  const filtros: Filtros = useMemo(
    () => ({
      ...estado,
      filiais: estado.filiais ?? filiaisQuery.data?.filiais.map((f) => f.codigo) ?? [],
    }),
    [estado, filiaisQuery.data],
  );

  const resumo = useQuery(painelQueries.resumo(filtros));
  const meta = useQuery(painelQueries.meta(filtros));
  const departamentos = useQuery(painelQueries.departamentos(filtros, "departamento"));

  const listaAlertas = useMemo(() => {
    if (!resumo.data || !departamentos.data) return [];
    return gerarAlertas(
      indicadores(resumo.data.atual.dias),
      indicadores(resumo.data.anterior.dias),
      departamentos.data.linhas.map(calcularLinha),
    );
  }, [resumo.data, departamentos.data]);

  const atualizando = resumo.isPlaceholderData || meta.isPlaceholderData;

  // Dias sem carga distorcem a comparação: avisa em vez de esconder.
  const lacunas = useMemo(() => {
    if (!resumo.data) return [];
    return (["atual", "anterior"] as const).flatMap((chave) => {
      const { dias, periodo } = resumo.data[chave];
      const comVenda = totais(dias).cobertura.venda;
      if (comVenda === dias.length) return [];
      const nome = chave === "atual" ? "Período atual" : "Período de comparação";
      return [
        `${nome} (${formatData(periodo.inicio)} a ${formatData(periodo.fim)}) tem venda carregada em ${comVenda} de ${dias.length} dias.`,
      ];
    });
  }, [resumo.data]);

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Painel Executivo</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {/* Subtítulo curto: título e filtros cabem na mesma linha. */}
            <Icon path={mdiDatabaseClockOutline} size={0.6} aria-hidden />
            {filiaisQuery.data?.dataMaxima
              ? `Dados até ${formatData(filiaisQuery.data.dataMaxima)}`
              : "Carregando…"}
          </p>
        </div>
        {filiaisQuery.data ? (
          <FiltrosBar
            filtros={filtros}
            onChange={(f) => setEstado(f)}
            filiais={filiaisQuery.data.filiais}
            dataMinima={filiaisQuery.data.dataMinima}
            dataMaxima={filiaisQuery.data.dataMaxima}
          />
        ) : (
          <Skeleton className="h-14 w-[56rem] max-w-full" />
        )}
      </div>

      {(filiaisQuery.isError || resumo.isError) && (
        <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-negative-highlight px-3 py-2 text-sm">
          <Icon path={mdiAlertCircleOutline} size={0.9} className="text-error" aria-hidden />
          <span>{(filiaisQuery.error ?? resumo.error)?.message}</span>
          <button
            type="button"
            onClick={() => (filiaisQuery.isError ? filiaisQuery.refetch() : resumo.refetch())}
            className="ml-auto rounded-lg border bg-card px-3 py-1 font-medium hover:bg-secondary"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {lacunas.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-summary-orange-bg px-3 py-2 text-xs">
          <Icon path={mdiAlertOutline} size={0.9} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div>
            <div className="font-semibold">Dados incompletos: as variações podem estar distorcidas.</div>
            {lacunas.map((texto) => (
              <div key={texto} className="text-muted-foreground">
                {texto}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-2.5 transition-opacity ${atualizando ? "opacity-60" : ""}`} aria-busy={atualizando}>
        <KpiGrid
          resumo={resumo.data}
          meta={meta.data}
          carregando={resumo.isPending}
          carregandoMeta={meta.isPending}
        />

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          <EvolucaoChart
            titulo="Evolução da Venda"
            medida="venda"
            cor="var(--chart-1)"
            formatValor={formatMoeda}
            formatEixo={formatMoedaCompacta}
            resumo={resumo.data}
            carregando={resumo.isPending}
          />
          <EvolucaoChart
            titulo="Evolução da Margem Bruta"
            medida="margem"
            cor="var(--chart-5)"
            formatValor={formatPercentual}
            formatEixo={(v) => `${Math.round(v)}%`}
            resumo={resumo.data}
            carregando={resumo.isPending}
          />
          <MetaAcumulado meta={meta.data} carregando={meta.isPending} />
        </div>

        <ResizableRow
          storageKey="sgbi:painel-executivo:linha-departamentos"
          esquerda={<DepartamentosTable filtros={filtros} />}
          direita={
            <AlertasList alertas={listaAlertas} carregando={resumo.isPending || departamentos.isPending} />
          }
        />
      </div>
    </div>
  );
}
