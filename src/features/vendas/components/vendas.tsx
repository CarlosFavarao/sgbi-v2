"use client";

import Icon from "@mdi/react";
import { mdiDatabaseClockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAvisos, type Aviso } from "@/components/avisos";
import { EvolucaoChart } from "@/components/charts/evolucao-chart";
import { FiltrosBar } from "@/components/filtros/filtros-bar";
import { useAcesso } from "@/components/acesso/contexto";
import { BarraEdicao } from "@/components/layout/barra-edicao";
import { BlocoKpis } from "@/components/layout/bloco-kpis";
import { GradePersonalizavel } from "@/components/layout/grade-personalizavel";
import { useLayout } from "@/components/layout/use-layout";
import { Spinner } from "@/components/ui/spinner";
import { PERIODO_PADRAO } from "@/lib/config";
import { periodoComparacao } from "@/lib/date";
import { formatData, formatMoeda, formatMoedaCompacta, formatPercentual } from "@/lib/format";
import { evolucaoComparativa } from "@/lib/serie";
import { combinarSeries, indicadores } from "../compute";
import { vendasQueries } from "../queries";
import type { DiaVendas, Filtros } from "../types";
import { CurvaAbc } from "./curva-abc";
import { DepartamentosBarras } from "./departamentos-barras";
import { DesempenhoTable } from "./desempenho-table";
import { kpisDeVendas } from "./kpis-vendas";
import { FONTES, LAYOUT_PADRAO, LIMITES, ROTULOS } from "../layout";
import { ProdutosLista } from "./produtos-lista";

type FiltrosEstado = Omit<Filtros, "filiais"> & { filiais: number[] | null };

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean }) => q.isPending || q.isPlaceholderData;

/** Medidas da evolução: null quando nenhum dia do intervalo tem venda carregada. */
const vendaDe = (dias: DiaVendas[]) => {
  const i = indicadores(dias);
  return i.cobertura.venda ? i.venda : null;
};
const margemDe = (dias: DiaVendas[]) => {
  const i = indicadores(dias);
  return i.cobertura.venda ? i.margem : null;
};

export function Vendas() {
  const filiaisQuery = useQuery(vendasQueries.filiais());
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

  // Uma consulta por fonte: a venda (rápida) não espera os cupons (logpdv, lenta).
  // Fonte que a plataforma não envia ao banco não é consultada (os cards dela ficam desabilitados, D46).
  const { seHouver } = useAcesso();
  const vendas = useQuery(seHouver(vendasQueries.serie(filtros, "vendas"), ["venda"]));
  const cupons = useQuery(seHouver(vendasQueries.serie(filtros, "cupons"), ["pdv"]));
  const departamentos = useQuery(seHouver(vendasQueries.niveis(filtros, "departamento"), ["venda"]));
  const produtos = useQuery(seHouver(vendasQueries.produtos(filtros), ["venda"]));

  const anterior = useMemo(
    () => periodoComparacao(filtros.periodo, filtros.comparacao),
    [filtros.periodo, filtros.comparacao],
  );
  const resumo = useMemo(
    () => combinarSeries(filtros.periodo, anterior, [vendas.data, cupons.data]),
    [filtros.periodo, anterior, vendas.data, cupons.data],
  );

  const vendasPendentes = carregando(vendas);
  const cuponsPendentes = carregando(cupons);

  const totalCupons = useMemo(() => {
    if (cuponsPendentes) return undefined;
    const a = indicadores(resumo.atual.dias);
    const b = indicadores(resumo.anterior.dias);
    return { cupons: a.cupons, itens: a.itens, cuponsAnterior: b.cupons, itensAnterior: b.itens };
  }, [resumo, cuponsPendentes]);

  const erro = [filiaisQuery, vendas, cupons, departamentos, produtos].find((q) => q.isError);

  // Dias sem carga distorcem a comparação: avisa em vez de esconder.
  const lacunas = useMemo(() => {
    const mensagens: string[] = [];
    const fontes = [
      { nome: "venda", campo: "venda", pendente: vendasPendentes },
      { nome: "cupons do PDV", campo: "cupons", pendente: cuponsPendentes },
    ] as const;
    for (const fonte of fontes) {
      if (fonte.pendente) continue;
      for (const chave of ["atual", "anterior"] as const) {
        const { dias, periodo } = resumo[chave];
        const comDados = indicadores(dias).cobertura[fonte.campo];
        if (comDados === dias.length) continue;
        const nome = chave === "atual" ? "Período atual" : "Período de comparação";
        mensagens.push(
          `${nome} (${formatData(periodo.inicio)} a ${formatData(periodo.fim)}): ${fonte.nome} em ${comDados} de ${dias.length} dias.`,
        );
      }
    }
    return mensagens;
  }, [resumo, vendasPendentes, cuponsPendentes]);

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
  if (lacunas.length) {
    avisos.push({
      id: "dados-incompletos",
      nivel: "atencao",
      titulo: "Dados incompletos: as variações podem estar distorcidas",
      detalhes: lacunas,
    });
  }
  // Avisos vão para o botão de triângulo na barra lateral (popup), não para faixas no topo.
  useAvisos("vendas", avisos);

  const grade = useLayout("vendas", LAYOUT_PADRAO, LIMITES);
  const kpis = kpisDeVendas({ resumo, carregando: { vendas: vendasPendentes, cupons: cuponsPendentes } });
  const listas = produtos.data?.listas;
  const produtosCarregando = carregando(produtos);

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Vendas</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Icon path={mdiDatabaseClockOutline} size={0.6} aria-hidden />
            {filiaisQuery.data?.dataMaxima ? `Dados até ${formatData(filiaisQuery.data.dataMaxima)}` : "Carregando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
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
          <BarraEdicao
            grade={grade}
            rotulos={ROTULOS}
            rotulosBlocos={{
              kpis: { titulo: "Indicadores", itens: Object.fromEntries(kpis.map((k) => [k.id, k.titulo])) },
            }}
          />
        </div>
      </div>

      <GradePersonalizavel
        fontes={FONTES}
        grade={grade}
        rotulos={ROTULOS}
        blocos={["kpis"]}
        cards={{
          kpis: <BlocoKpis fontes={FONTES} grade={grade} bloco="kpis" itens={kpis} maxColunas={6} />,
          "evolucao-vendas": (
            <EvolucaoChart
              titulo="Evolução das Vendas"
              nomeAtual="Venda atual"
              cor="var(--chart-1)"
              formatValor={formatMoeda}
              formatEixo={formatMoedaCompacta}
              pontos={(g) => evolucaoComparativa(resumo.atual.dias, resumo.anterior.dias, g, vendaDe)}
              carregando={vendasPendentes}
              alturaGrafico="min-h-0 flex-1"
            />
          ),
          departamentos: (
            <DepartamentosBarras linhas={departamentos.data?.linhas} carregando={carregando(departamentos)} />
          ),
          "evolucao-margem": (
            <EvolucaoChart
              titulo="Evolução da Margem Bruta"
              nomeAtual="Margem atual"
              cor="var(--chart-5)"
              formatValor={formatPercentual}
              formatEixo={(v) => `${Math.round(v)}%`}
              larguraEixo={44}
              eixoDesdeZero
              pontos={(g) => evolucaoComparativa(resumo.atual.dias, resumo.anterior.dias, g, margemDe)}
              carregando={vendasPendentes}
              alturaGrafico="min-h-0 flex-1"
            />
          ),
          desempenho: <DesempenhoTable filtros={filtros} totalCupons={totalCupons} />,
          "curva-abc": <CurvaAbc abc={produtos.data?.abc} carregando={produtosCarregando} />,
          queda: (
            <ProdutosLista
              titulo="Produtos A com maior queda de vendas"
              descricao="Produtos da classe A (faturamento) com a maior queda % da venda contra o período de comparação."
              lista="queda"
              produtos={listas?.queda}
              carregando={produtosCarregando}
            />
          ),
          crescimento: (
            <ProdutosLista
              titulo="Produtos A com maior crescimento de vendas"
              descricao="Produtos da classe A (faturamento) com o maior crescimento % da venda. Só entram produtos com venda no período de comparação."
              lista="crescimento"
              produtos={listas?.crescimento}
              carregando={produtosCarregando}
            />
          ),
          "maior-margem": (
            <ProdutosLista
              titulo="Produtos com maior margem bruta (Classe A e B)"
              descricao="Produtos das classes A e B (faturamento) com a maior margem bruta no período."
              lista="maior-margem"
              produtos={listas?.["maior-margem"]}
              carregando={produtosCarregando}
            />
          ),
          "menor-margem": (
            <ProdutosLista
              titulo="Produtos com menor margem bruta (Classe A e B)"
              descricao="Produtos das classes A e B (faturamento) com a menor margem bruta no período."
              lista="menor-margem"
              produtos={listas?.["menor-margem"]}
              carregando={produtosCarregando}
            />
          ),
        }}
      />
    </div>
  );
}
