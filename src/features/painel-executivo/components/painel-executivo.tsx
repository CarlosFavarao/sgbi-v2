"use client";

import Icon from "@mdi/react";
import { mdiDatabaseClockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAvisos } from "@/components/avisos";
import { ResizableRow } from "@/components/ui/resizable-row";
import { Spinner } from "@/components/ui/spinner";
import {
  alertas as gerarAlertas,
  calcularLinha,
  combinarSeries,
  indicadores,
  margemDoIntervalo,
  totais,
  vendaDoIntervalo,
} from "../compute";
import { periodoComparacao } from "@/lib/date";
import { PERIODO_PADRAO } from "../config";
import { formatData, formatMoedaCompacta, formatMoeda, formatPercentual } from "@/lib/format";
import { painelQueries } from "../queries";
import type { Filtros } from "../types";
import { AlertasList } from "./alertas-list";
import { DepartamentosTable } from "./departamentos-table";
import { EvolucaoChart } from "@/components/charts/evolucao-chart";
import { evolucaoComparativa } from "@/lib/serie";
import { FiltrosBar } from "@/components/filtros/filtros-bar";
import { KpiGrid } from "./kpi-grid";
import { MetaAcumulado } from "./meta-acumulado";

type FiltrosEstado = Omit<Filtros, "filiais"> & { filiais: number[] | null };

export function PainelExecutivo() {
  const filiaisQuery = useQuery(painelQueries.filiais());
  const [estado, setEstado] = useState<FiltrosEstado>({
    periodo: PERIODO_PADRAO,
    comparacao: { tipo: "periodo-anterior" },
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

  // Uma consulta por fonte: cada card aparece assim que as suas fontes chegam.
  const vendas = useQuery(painelQueries.serie(filtros, "vendas"));
  const pdv = useQuery(painelQueries.serie(filtros, "pdv"));
  const cancelamentos = useQuery(painelQueries.serie(filtros, "cancelamentos"));
  const despesas = useQuery(painelQueries.serie(filtros, "despesas"));
  const meta = useQuery(painelQueries.meta(filtros));
  const departamentos = useQuery(painelQueries.departamentos(filtros, "departamento"));

  // Carregando = primeira carga ou troca de filtro (dados anteriores ficam cobertos).
  const carregando = (q: { isPending: boolean; isPlaceholderData: boolean }) =>
    q.isPending || q.isPlaceholderData;
  const fontesCarregando = {
    vendas: carregando(vendas),
    pdv: carregando(pdv),
    cancelamentos: carregando(cancelamentos),
    despesas: carregando(despesas),
    meta: carregando(meta),
  };

  const periodoAnterior = useMemo(
    () => periodoComparacao(filtros.periodo, filtros.comparacao),
    [filtros.periodo, filtros.comparacao],
  );
  const resumo = useMemo(
    () =>
      combinarSeries(filtros.periodo, periodoAnterior, [vendas.data, pdv.data, cancelamentos.data, despesas.data]),
    [filtros.periodo, periodoAnterior, vendas.data, pdv.data, cancelamentos.data, despesas.data],
  );

  const alertasCarregando =
    fontesCarregando.vendas ||
    fontesCarregando.despesas ||
    fontesCarregando.cancelamentos ||
    carregando(departamentos);

  const listaAlertas = useMemo(() => {
    if (alertasCarregando || !departamentos.data) return [];
    return gerarAlertas(
      indicadores(resumo.atual.dias),
      indicadores(resumo.anterior.dias),
      departamentos.data.linhas.map(calcularLinha),
    );
  }, [alertasCarregando, resumo, departamentos.data]);

  const erro = [filiaisQuery, vendas, pdv, cancelamentos, despesas, meta, departamentos].find((q) => q.isError);

  // Dias sem carga distorcem a comparação: avisa em vez de esconder.
  const lacunas = useMemo(() => {
    if (fontesCarregando.vendas) return [];
    return (["atual", "anterior"] as const).flatMap((chave) => {
      const { dias, periodo } = resumo[chave];
      const comVenda = totais(dias).cobertura.venda;
      if (comVenda === dias.length) return [];
      const nome = chave === "atual" ? "Período atual" : "Período de comparação";
      return [
        `${nome} (${formatData(periodo.inicio)} a ${formatData(periodo.fim)}) tem venda carregada em ${comVenda} de ${dias.length} dias.`,
      ];
    });
  }, [fontesCarregando.vendas, resumo]);

  // Avisos vão para o botão de triângulo na barra lateral (popup), não para faixas no topo.
  useAvisos("painel-executivo", [
    ...(erro
      ? [
          {
            id: "erro-carregamento",
            nivel: "erro" as const,
            titulo: "Não foi possível carregar parte dos dados",
            detalhes: [erro.error?.message ?? "Erro desconhecido."],
            acao: { label: "Tentar novamente", onClick: () => void erro.refetch() },
          },
        ]
      : []),
    ...(lacunas.length
      ? [
          {
            id: "dados-incompletos",
            nivel: "atencao" as const,
            titulo: "Dados incompletos: as variações podem estar distorcidas",
            detalhes: lacunas,
          },
        ]
      : []),
  ]);

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
          <div className="flex h-14 items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-5 text-primary" />
            Carregando filtros…
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <KpiGrid
          resumo={resumo}
          meta={meta.data}
          carregando={fontesCarregando}
        />

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          <EvolucaoChart
            titulo="Evolução da Venda"
            nomeAtual="Venda atual"
            cor="var(--chart-1)"
            formatValor={formatMoeda}
            formatEixo={formatMoedaCompacta}
            pontos={(g) => evolucaoComparativa(resumo.atual.dias, resumo.anterior.dias, g, vendaDoIntervalo)}
            carregando={fontesCarregando.vendas}
          />
          <EvolucaoChart
            titulo="Evolução da Margem Bruta"
            nomeAtual="Margem atual"
            cor="var(--chart-5)"
            formatValor={formatPercentual}
            formatEixo={(v) => `${Math.round(v)}%`}
            larguraEixo={44}
            eixoDesdeZero
            pontos={(g) => evolucaoComparativa(resumo.atual.dias, resumo.anterior.dias, g, margemDoIntervalo)}
            carregando={fontesCarregando.vendas}
          />
          <MetaAcumulado meta={meta.data} carregando={fontesCarregando.meta} />
        </div>

        <ResizableRow
          storageKey="sgbi:painel-executivo:linha-departamentos"
          esquerda={<DepartamentosTable filtros={filtros} />}
          direita={
            <AlertasList alertas={listaAlertas} carregando={alertasCarregando} />
          }
        />
      </div>
    </div>
  );
}
