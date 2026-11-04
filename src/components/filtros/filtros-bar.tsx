"use client";

import { DateRangePicker, type AtalhoIntervalo } from "@/components/ui/date-range-picker";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  addDays,
  ATALHOS_COMPARACAO,
  daysBetween,
  firstDayOfMonth,
  lastDayOfMonth,
  periodoComparacao,
  resolverAtalhoComparacao,
} from "@/lib/date";
import { formatData } from "@/lib/format";
import type { AtalhoComparacao, Filial, Filtros, Origem, Periodo } from "@/lib/filtros";
import { FiliaisSelect } from "./filiais-select";

const ORIGENS: { value: Origem; label: string }[] = [
  { value: "todos", label: "PDV + Faturamento" },
  { value: "pdv", label: "PDV" },
  { value: "faturamento", label: "Faturamento" },
];

/** Atalhos do Período, relativos ao último dia carregado (não a "hoje": os dados são D-1). */
function atalhosPeriodo(dataMaxima: string | null): AtalhoIntervalo[] {
  if (!dataMaxima) return [];
  const mesAnterior = addDays(firstDayOfMonth(dataMaxima), -1);
  return [
    {
      id: "mes-anterior",
      label: "Último mês fechado",
      intervalo: { inicio: firstDayOfMonth(mesAnterior), fim: lastDayOfMonth(mesAnterior) },
    },
    { id: "mes-atual", label: "Mês da última carga", intervalo: { inicio: firstDayOfMonth(dataMaxima), fim: dataMaxima } },
    { id: "7-dias", label: "Últimos 7 dias", intervalo: { inicio: addDays(dataMaxima, -6), fim: dataMaxima } },
    { id: "30-dias", label: "Últimos 30 dias", intervalo: { inicio: addDays(dataMaxima, -29), fim: dataMaxima } },
    { id: "90-dias", label: "Últimos 90 dias", intervalo: { inicio: addDays(dataMaxima, -89), fim: dataMaxima } },
  ];
}

const contarDias = (p: Periodo) => {
  const n = daysBetween(p.inicio, p.fim) + 1;
  return `${n} ${n === 1 ? "dia" : "dias"}`;
};

export function FiltrosBar({
  filtros,
  onChange,
  filiais,
  dataMinima,
  dataMaxima,
}: {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  filiais: Filial[];
  dataMinima: string | null;
  dataMaxima: string | null;
}) {
  const comparacao = periodoComparacao(filtros.periodo, filtros.comparacao);
  const atalhosDoPeriodo = atalhosPeriodo(dataMaxima);
  const periodoEhAtalho = atalhosDoPeriodo.some(
    (a) => a.intervalo.inicio === filtros.periodo.inicio && a.intervalo.fim === filtros.periodo.fim,
  );
  const intervaloTexto = (p: Periodo) => `${formatData(p.inicio)} – ${formatData(p.fim)}`;
  // Atalhos de comparação recuam a partir do Período atual.
  const atalhosComparacao: AtalhoIntervalo<AtalhoComparacao>[] = ATALHOS_COMPARACAO.map((a) => ({
    ...a,
    intervalo: resolverAtalhoComparacao(filtros.periodo, a.id),
  }));

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Com atalho, o botão mostra o nome e as datas ficam no rótulo (cabe numa linha em 1366px). */}
      <Field
        label={`Período · ${periodoEhAtalho ? intervaloTexto(filtros.periodo) : contarDias(filtros.periodo)}`}
      >
        <DateRangePicker
          rotulo="Período"
          value={filtros.periodo}
          atalhos={atalhosDoPeriodo}
          somenteAtalhoNoBotao
          dataMinima={dataMinima}
          dataMaxima={dataMaxima}
          onApply={(periodo) => onChange({ ...filtros, periodo })}
        />
      </Field>

      <Field
        label={`Comparar com · ${
          filtros.comparacao.tipo === "personalizado" ? contarDias(comparacao) : intervaloTexto(comparacao)
        }`}
      >
        <DateRangePicker
          rotulo="Comparar com"
          value={comparacao}
          atalhos={atalhosComparacao}
          atalhoAplicado={filtros.comparacao.tipo === "personalizado" ? null : filtros.comparacao.tipo}
          referencia={{ intervalo: filtros.periodo, legenda: "Período" }}
          legendaSelecao="Comparação"
          somenteAtalhoNoBotao
          // A comparação pode ser anterior ao início da analise (ex.: PDV do ano anterior).
          dataMaxima={dataMaxima}
          onApply={(periodo, atalho) =>
            onChange({
              ...filtros,
              // Atalho fica relativo: acompanha o Período quando ele muda.
              comparacao: atalho ? { tipo: atalho } : { tipo: "personalizado", periodo },
            })
          }
        />
      </Field>

      <Field label="Filial">
        <FiliaisSelect
          filiais={filiais}
          value={filtros.filiais}
          onChange={(value) => onChange({ ...filtros, filiais: value })}
        />
      </Field>

      <Field label="Origem da venda">
        <Segmented
          label="Origem da venda"
          value={filtros.origem}
          options={ORIGENS}
          onChange={(origem) => onChange({ ...filtros, origem })}
        />
      </Field>
    </div>
  );
}
