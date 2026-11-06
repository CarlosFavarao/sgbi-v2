"use client";

import Icon from "@mdi/react";
import { mdiDatabaseClockOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAvisos, type Aviso } from "@/components/avisos";
import { BarraEdicao } from "@/components/layout/barra-edicao";
import { BlocoKpis } from "@/components/layout/bloco-kpis";
import { GradePersonalizavel } from "@/components/layout/grade-personalizavel";
import { useLayout } from "@/components/layout/use-layout";
import { Spinner } from "@/components/ui/spinner";
import { variacao } from "@/lib/calc";
import { formatData, formatMesAno } from "@/lib/format";
import { curvaCumprimento, percentual, resumirMeta, somaMetaDiaria, somaRealizado, type ResumoMeta } from "../compute";
import { dataReferencia, periodosDaReferencia } from "../periodos";
import { metasQueries } from "../queries";
import type { AbaPeriodo, FiltrosMetas, MetaDia, PeriodoMeta, RealizadoDia } from "../types";
import { AbasPeriodo } from "./abas-periodo";
import { calcularLinha, AcompanhamentoTable, type LinhaAcompanhamento } from "./acompanhamento-table";
import { AtingimentoDepartamentos } from "./atingimento-departamentos";
import { MetasPorPeriodo, RankingDepartamentos, ritmo, SituacaoMargem } from "./cards-inferiores";
import { CumprimentoChart } from "./cumprimento-chart";
import { FiltrosMetasBar } from "./filtros-metas";
import { kpisDasMetas, type Comparativo } from "./kpis-metas";
import { LAYOUT_PADRAO, LIMITES, ROTULOS } from "../layout";

/** Nomes fixos dos KPIs na lista de ocultos (o título do card muda com a aba). */
const TITULOS_KPIS: Record<string, string> = {
  meta: "Meta",
  realizado: "Venda Realizada",
  atingimento: "Atingimento da Meta",
  diferenca: "Diferença para a Meta",
  projecao: "Projeção",
  status: "Status",
};

type FiltrosEstado = Omit<FiltrosMetas, "filiais" | "mes"> & {
  filiais: number[] | null;
  mes: string | null;
};

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean; fetchStatus: string }) =>
  (q.isPending && q.fetchStatus !== "idle") || q.isPlaceholderData;

/** Resumo de uma aba a partir das metas diárias e do realizado (ou do total, na aba Ano). */
function resumoDaAba(
  p: PeriodoMeta,
  metas: MetaDia[],
  realizados: RealizadoDia[],
  totalAno: { venda: number; custo: number } | undefined,
): ResumoMeta {
  const meta = somaMetaDiaria(metas, p.periodo);
  const esperada = somaMetaDiaria(metas, p.decorrido);
  const real = p.id === "ano" ? (p.decorrido ? totalAno : null) : somaRealizado(realizados, p.decorrido);
  return resumirMeta({
    meta,
    // Período não começado: nada esperado ainda; sem meta: null.
    metaEsperada: meta ? (esperada?.meta ?? 0) : null,
    venda: real?.venda ?? 0,
    custo: real?.custo ?? 0,
    periodo: p.periodo,
    decorrido: p.decorrido,
  });
}

export function Metas() {
  const filiaisQuery = useQuery(metasQueries.filiais());
  const dataMaxima = filiaisQuery.data?.dataMaxima ?? null;
  const [estado, setEstado] = useState<FiltrosEstado>({
    // null = mês do último dia carregado (resolvido quando as filiais chegam).
    mes: null,
    filiais: null,
    origem: "todos",
    departamento: null,
  });
  const [aba, setAba] = useState<AbaPeriodo>("dia");

  const filtros: FiltrosMetas = {
    ...estado,
    mes: estado.mes ?? dataMaxima?.slice(0, 7) ?? "",
    filiais: estado.filiais ?? filiaisQuery.data?.filiais.map((f) => f.codigo) ?? [],
  };
  const opcoes = useQuery(metasQueries.opcoes(filtros.filiais));

  const referencia = filtros.mes && dataMaxima ? dataReferencia(filtros.mes, dataMaxima) : null;
  const periodos = useMemo(
    () => (filtros.mes && referencia ? periodosDaReferencia(filtros.mes, referencia) : []),
    [filtros.mes, referencia],
  );
  const ativa = periodos.find((p) => p.id === aba);
  const porId = (id: AbaPeriodo) => periodos.find((p) => p.id === id);
  const ano = porId("ano");
  const mes = porId("mes");
  const semana = porId("semana");

  // Janela diária: do início da semana (ou do mês) até a referência.
  const janela =
    mes?.decorrido && semana
      ? {
          inicio: semana.periodo.inicio < mes.periodo.inicio ? semana.periodo.inicio : mes.periodo.inicio,
          fim: mes.decorrido.fim,
        }
      : null;

  const metasAno = useQuery(metasQueries.metasDiarias(filtros, ano?.periodo ?? null));
  const metasComparacao = useQuery(metasQueries.metasDiarias(filtros, ativa?.periodoComparacao ?? null));
  const realizadoMes = useQuery(metasQueries.realizadoDiario(filtros, janela));
  const totalAno = useQuery(metasQueries.total(filtros, ano?.decorrido ?? null));
  const totalComparacao = useQuery(metasQueries.total(filtros, ativa?.comparacao ?? null));
  const departamentos = useQuery(metasQueries.niveis(filtros, "departamento", ativa));

  const metasDias = metasAno.data?.dias ?? [];
  const realizados = realizadoMes.data?.dias ?? [];
  const metasPendentes = carregando(metasAno);
  const realizadoPendente = carregando(realizadoMes) || (aba === "ano" && carregando(totalAno));

  const resumos = periodos.map((p) => ({
    periodo: p,
    resumo: resumoDaAba(p, metasDias, realizados, totalAno.data),
  }));
  const resumoAtivo = resumos.find((r) => r.periodo.id === aba)?.resumo;

  // Comparação: meta do período anterior inteiro e realizado até o mesmo ponto.
  let comparativo: Comparativo | null = null;
  if (ativa?.comparacao && metasComparacao.data && totalComparacao.data) {
    const meta = somaMetaDiaria(metasComparacao.data.dias, ativa.periodoComparacao)?.meta ?? null;
    const realizado = totalComparacao.data.venda;
    comparativo = {
      meta,
      realizado,
      atingimento: meta ? percentual(realizado, meta) : null,
      diferenca: meta != null ? realizado - meta : null,
    };
  }

  // Séries diárias da parte decorrida (minigráficos).
  const diasDecorridos = ativa?.decorrido
    ? realizados.filter((d) => d.data >= ativa.decorrido!.inicio && d.data <= ativa.decorrido!.fim)
    : [];
  const metaDoDia = new Map(metasDias.map((m) => [m.data, m.meta]));
  const series = {
    meta: diasDecorridos.map((d) => ({
      data: d.data,
      valor: metaDoDia.get(d.data) ?? null,
    })),
    realizado: diasDecorridos.map((d) => ({ data: d.data, valor: d.venda })),
    atingimento: diasDecorridos.map((d) => {
      const m = metaDoDia.get(d.data);
      return { data: d.data, valor: m ? (d.venda / m) * 100 : null };
    }),
  };

  const pontosCumprimento = mes && referencia ? curvaCumprimento(mes.periodo, referencia, metasDias, realizados) : [];

  const linhasDepartamento: LinhaAcompanhamento[] = ativa
    ? (departamentos.data?.linhas ?? []).map((l) => calcularLinha(l, ativa))
    : [];
  const comRitmo = linhasDepartamento.filter((l) => ritmo(l.resumo) != null);
  const emRisco = comRitmo
    .filter((l) => l.resumo.status === "abaixo")
    .sort((a, b) => ritmo(a.resumo)! - ritmo(b.resumo)!);
  const melhores = comRitmo
    .filter((l) => l.resumo.status === "acima" || l.resumo.status === "no-ritmo")
    .sort((a, b) => ritmo(b.resumo)! - ritmo(a.resumo)!);

  const total: LinhaAcompanhamento | null = resumoAtivo
    ? {
        codigo: 0,
        descricao: "Total",
        pai: null,
        resumo: resumoAtivo,
        variacaoVenda: ativa?.decorrido ? variacao(resumoAtivo.realizado, totalComparacao.data?.venda ?? null) : null,
      }
    : null;
  const esperadoPct =
    resumoAtivo?.meta && resumoAtivo.metaEsperada != null ? (resumoAtivo.metaEsperada / resumoAtivo.meta) * 100 : null;

  const erro = [
    filiaisQuery,
    opcoes,
    metasAno,
    metasComparacao,
    realizadoMes,
    totalAno,
    totalComparacao,
    departamentos,
  ].find((q) => q.isError);
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
  if (!metasPendentes && filtros.mes && !metasDias.some((m) => m.data.startsWith(filtros.mes) && m.meta > 0)) {
    avisos.push({
      id: "sem-meta",
      nivel: "atencao",
      titulo: `Sem meta cadastrada em ${formatMesAno(filtros.mes)}`,
      detalhes: [
        opcoes.data?.mesesComMeta.length
          ? `Meses com meta nas filiais escolhidas: ${opcoes.data.mesesComMeta.map(formatMesAno).join(", ")}.`
          : "Nenhum mês tem meta cadastrada nas filiais escolhidas.",
        "A tela mostra o realizado e a projeção pela média diária.",
      ],
    });
  }
  const dataMinima = filiaisQuery.data?.dataMinima;
  if (mes && dataMinima && mes.periodo.fim < dataMinima) {
    avisos.push({
      id: "sem-venda",
      nivel: "atencao",
      titulo: `Sem venda carregada em ${formatMesAno(filtros.mes)}`,
      detalhes: [
        `A venda carregada começa em ${formatData(dataMinima)}: o realizado aparece zerado e a situação "Abaixo" não reflete a loja.`,
      ],
    });
  }
  // Avisos vão para o botão de triângulo na barra lateral (popup), não para faixas no topo.
  useAvisos("metas", avisos);

  const grade = useLayout("metas", LAYOUT_PADRAO, LIMITES);
  const deptoCarregando = carregando(departamentos);

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Metas</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Icon path={mdiDatabaseClockOutline} size={0.6} aria-hidden />
            {referencia ? `Referência ${formatData(referencia)}` : "Carregando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {filiaisQuery.data && opcoes.data && filtros.mes ? (
            <FiltrosMetasBar
              filtros={filtros}
              onChange={(f) => setEstado(f)}
              filiais={filiaisQuery.data.filiais}
              dataMinima={filiaisQuery.data.dataMinima}
              dataMaxima={filiaisQuery.data.dataMaxima}
              mesesComMeta={opcoes.data.mesesComMeta}
              departamentos={opcoes.data.departamentos}
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
            rotulosBlocos={{ kpis: { titulo: "Indicadores", itens: TITULOS_KPIS } }}
          />
        </div>
      </div>

      {!referencia || !ativa || !resumoAtivo || !mes || !total ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-5 text-primary" />
          Carregando…
        </div>
      ) : (
        <>
          <AbasPeriodo periodos={periodos} value={aba} onChange={setAba} referencia={referencia} />

          <GradePersonalizavel
            grade={grade}
            rotulos={ROTULOS}
            blocos={["kpis"]}
            cards={{
              kpis: (
                <BlocoKpis
                  grade={grade}
                  bloco="kpis"
                  itens={kpisDasMetas({
                    aba: aba,
                    resumo: resumoAtivo,
                    comparativo: comparativo,
                    rotuloComparacao: ativa.rotuloComparacao,
                    series: series,
                    carregando: { meta: metasPendentes, realizado: realizadoPendente },
                  })}
                  maxColunas={6}
                />
              ),
              cumprimento: (
                <CumprimentoChart
                  mes={filtros.mes}
                  referencia={referencia}
                  pontos={pontosCumprimento}
                  carregando={metasPendentes || carregando(realizadoMes)}
                />
              ),
              atingimento: (
                <AtingimentoDepartamentos
                  titulo={`Atingimento por Departamento · ${ativa.label}`}
                  linhas={linhasDepartamento}
                  esperado={esperadoPct}
                  carregando={deptoCarregando}
                />
              ),
              acompanhamento: <AcompanhamentoTable filtros={filtros} aba={ativa} total={total} />,
              "metas-periodo": (
                <MetasPorPeriodo
                  linhas={resumos}
                  ativa={aba}
                  onSelecionar={setAba}
                  carregando={metasPendentes || carregando(realizadoMes)}
                />
              ),
              "em-risco": (
                <RankingDepartamentos
                  titulo={`Departamentos em Risco · ${ativa.label}`}
                  descricao="Departamentos abaixo do ritmo da meta (realizado ÷ meta esperada até a referência), do pior para o melhor."
                  linhas={emRisco}
                  carregando={deptoCarregando}
                />
              ),
              melhores: (
                <RankingDepartamentos
                  titulo={`Melhor Desempenho · ${ativa.label}`}
                  descricao="Departamentos acima ou no ritmo da meta, do melhor para o pior."
                  linhas={melhores}
                  carregando={deptoCarregando}
                />
              ),
              margem: <SituacaoMargem linhas={linhasDepartamento} carregando={deptoCarregando} />,
            }}
          />
        </>
      )}
    </div>
  );
}
