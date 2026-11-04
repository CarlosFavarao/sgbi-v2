"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ABAS_FINANCEIRO, AbasModulo } from "@/components/abas-modulo";
import { useAvisos, type Aviso } from "@/components/avisos";
import { FiliaisSelect } from "@/components/filtros/filiais-select";
import { NaoIntegrado } from "@/components/nao-integrado";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { ResizableRow } from "@/components/ui/resizable-row";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { lastDayOfMonth } from "@/lib/date";
import { formatMesAno, formatMoeda } from "@/lib/format";
import { evolucaoGeracao, mesesAntes, mesesDoAno, montarDfc, type Dfc as DfcCalculada } from "../compute";
import { DFC_CONFIG } from "../config";
import { dfcQueries } from "../queries";
import type { ComparacaoDfc, FiltrosDfc } from "../types";
import { ComposicaoCard, type Fatia } from "./composicao-card";
import { DfcTable, type ModoDfc } from "./dfc-table";
import { GeracaoChart } from "./geracao-chart";
import { KpisDfc } from "./kpis-dfc";
import { MovimentacoesCard } from "./movimentacoes-card";

type FiltrosEstado = { mes: string | null; comparacao: ComparacaoDfc; filiais: number[] | null };

const COMPARACOES: { value: ComparacaoDfc; label: string }[] = [
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "ano-anterior", label: "Mesmo mês do ano anterior" },
];

const carregando = (q: { isPending: boolean; isPlaceholderData: boolean; fetchStatus: string }) =>
  (q.isPending && q.fetchStatus !== "idle") || q.isPlaceholderData;

/** Fatias da composição: linhas da DFC com valor (rótulo curto, sem o parêntese). */
function fatias(dfc: DfcCalculada, tipo: "entrada" | "saida"): Fatia[] {
  return dfc.atividades
    .flatMap((a) => a.linhas)
    .filter((l) => l.config.tipo === tipo && l.valor > 0)
    .map((l) => ({ nome: l.config.label.replace(/\s*\(.*\)$/, ""), valor: l.valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function Dfc() {
  const opcoes = useQuery(dfcQueries.opcoes());
  const [estado, setEstado] = useState<FiltrosEstado>({ mes: null, comparacao: "mes-anterior", filiais: null });
  const [modo, setModo] = useState<ModoDfc>("valores");

  const filtros: FiltrosDfc = {
    // null = último mês com receita na DRE.
    mes: estado.mes ?? opcoes.data?.ultimoMesComReceita ?? opcoes.data?.meses.at(-1) ?? "",
    comparacao: estado.comparacao,
    filiais: estado.filiais ?? opcoes.data?.filiais.map((f) => f.codigo) ?? [],
  };
  const mesComparacao = filtros.mes ? mesesAntes(filtros.mes, filtros.comparacao === "mes-anterior" ? 1 : 12) : "";
  const historico = filtros.mes
    ? { inicio: mesesAntes(filtros.mes, DFC_CONFIG.mesesHistorico - 1), fim: filtros.mes }
    : null;
  const periodoMes = filtros.mes ? { inicio: `${filtros.mes}-01`, fim: lastDayOfMonth(`${filtros.mes}-01`) } : null;

  const dre = useQuery(dfcQueries.dre(filtros, historico));
  const movimentacoes = useQuery(dfcQueries.movimentacoes(filtros, periodoMes));
  const linhas = dre.data?.linhas ?? [];
  const dreCarregando = carregando(dre);
  const listasRef = useRef<HTMLDivElement>(null);

  // Mês × comparação (ou acumulado do ano × acumulado até o mês de comparação).
  const acumulado = modo === "acumulado";
  const atual = montarDfc(linhas, acumulado ? mesesDoAno(filtros.mes || "2000-01") : new Set([filtros.mes]));
  const anterior = montarDfc(linhas, acumulado ? mesesDoAno(mesComparacao || "2000-01") : new Set([mesComparacao]));
  const temAnterior = linhas.some((l) => l.mes === mesComparacao);
  const doMes = acumulado ? montarDfc(linhas, new Set([filtros.mes])) : atual;

  const erro = [opcoes, dre, movimentacoes].find((q) => q.isError);
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
    id: "dfc-estimada",
    nivel: "atencao",
    titulo: "DFC estimada pela DRE (regime de competência)",
    detalhes: [
      "Entradas e saídas vêm da DRE gerencial do VX, não de recebimentos e pagamentos efetivos. Fornecedores são estimados pelo CMV.",
      `Ficam fora da DFC as linhas sem saída de caixa (perdas de mercadoria: ${formatMoeda(doMes.foraDaDfc)} no mês).`,
      "Saldos inicial e final dependem dos saldos bancários, que não estão no banco do SGBI.",
    ],
  });
  useAvisos("dfc", avisos);

  const cabecalho = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Financeiro <span className="text-base font-medium text-muted-foreground">· DFC</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {filtros.mes
              ? `Demonstração dos Fluxos de Caixa · ${formatMesAno(filtros.mes)} vs ${formatMesAno(mesComparacao)}`
              : "Carregando…"}
          </p>
        </div>
        <AbasModulo abas={ABAS_FINANCEIRO} label="Telas do Financeiro" />
      </div>
      {opcoes.data && filtros.mes ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Período">
            <Select
              aria-label="Mês"
              className="w-36"
              value={filtros.mes}
              options={[...opcoes.data.meses].reverse().map((m) => ({ value: m, label: formatMesAno(m) }))}
              onValueChange={(mes) => setEstado((e) => ({ ...e, mes }))}
            />
          </Field>
          <Field label="Comparar com">
            <Select
              aria-label="Comparar com"
              className="w-52"
              value={filtros.comparacao}
              options={COMPARACOES}
              onValueChange={(comparacao) => setEstado((e) => ({ ...e, comparacao }))}
            />
          </Field>
          <Field label="Filial">
            <FiliaisSelect
              filiais={opcoes.data.filiais}
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

  if (!filtros.mes) {
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

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5">
      {cabecalho}

      <KpisDfc
        atual={atual}
        anterior={temAnterior ? anterior : null}
        rotuloComparacao={acumulado ? "acum." : filtros.comparacao === "mes-anterior" ? "mês ant." : "ano ant."}
        carregando={dreCarregando}
      />

      <ResizableRow
        storageKey="sgbi:dfc:linha-principal"
        larguraInicial={58}
        abaixo={listasRef}
        alturaMinima={300}
        esquerda={
          <DfcTable
            atual={atual}
            anterior={temAnterior ? anterior : null}
            mes={filtros.mes}
            mesComparacao={mesComparacao}
            modo={modo}
            onModo={setModo}
            carregando={dreCarregando}
          />
        }
        direita={
          <div className="flex h-full min-h-0 flex-col gap-2.5">
            <GeracaoChart pontos={evolucaoGeracao(linhas, filtros.mes)} carregando={dreCarregando} />
            <ComposicaoCard
              entradas={fatias(doMes, "entrada")}
              saidas={fatias(doMes, "saida")}
              carregando={dreCarregando}
            />
          </div>
        }
      />

      <div ref={listasRef} className="grid grid-cols-1 gap-2.5 xl:grid-cols-[2fr_3fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Saldo por Conta Financeira</CardTitle>
          </CardHeader>
          <div className="h-40">
            <NaoIntegrado
              titulo="Contas financeiras não integradas"
              detalhe="O banco do SGBI não tem contas bancárias, caixas nem saldos. Ver pendência P42 em decisoes-e-pendencias.md."
            />
          </div>
        </Card>
        <MovimentacoesCard lista={movimentacoes.data?.movimentacoes ?? []} carregando={carregando(movimentacoes)} />
      </div>
    </div>
  );
}
