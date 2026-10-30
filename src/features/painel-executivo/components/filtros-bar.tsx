"use client";

import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { addDays, daysBetween, firstDayOfMonth, lastDayOfMonth } from "../date";
import type { Comparacao, Filial, Filtros, Origem, Periodo } from "../types";
import { FiliaisSelect } from "./filiais-select";

type Preset = { id: string; label: string; periodo: Periodo };

/** Atalhos relativos ao último dia carregado (não a "hoje": os dados são D-1). */
function presets(dataMaxima: string | null): Preset[] {
  if (!dataMaxima) return [];
  const mesAnterior = addDays(firstDayOfMonth(dataMaxima), -1);
  return [
    {
      id: "mes-anterior",
      label: "Último mês fechado",
      periodo: { inicio: firstDayOfMonth(mesAnterior), fim: lastDayOfMonth(mesAnterior) },
    },
    {
      id: "mes-atual",
      label: "Mês da última carga",
      periodo: { inicio: firstDayOfMonth(dataMaxima), fim: dataMaxima },
    },
    { id: "7-dias", label: "Últimos 7 dias", periodo: { inicio: addDays(dataMaxima, -6), fim: dataMaxima } },
    { id: "30-dias", label: "Últimos 30 dias", periodo: { inicio: addDays(dataMaxima, -29), fim: dataMaxima } },
  ];
}

const ORIGENS: { value: Origem; label: string }[] = [
  { value: "todos", label: "PDV + Faturamento" },
  { value: "pdv", label: "PDV" },
  { value: "faturamento", label: "Faturamento" },
];

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
  const atalhos = presets(dataMaxima);
  const atalhoAtual = atalhos.find(
    (p) => p.periodo.inicio === filtros.periodo.inicio && p.periodo.fim === filtros.periodo.fim,
  );
  const dias = daysBetween(filtros.periodo.inicio, filtros.periodo.fim) + 1;

  const setPeriodo = (periodo: Periodo) => {
    if (periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim) {
      onChange({ ...filtros, periodo });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label={`Período · ${dias} ${dias === 1 ? "dia" : "dias"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Atalhos de período"
            className="w-44"
            value={atalhoAtual?.id ?? "personalizado"}
            onChange={(e) => {
              const preset = atalhos.find((p) => p.id === e.target.value);
              if (preset) setPeriodo(preset.periodo);
            }}
          >
            <option value="personalizado" disabled>
              Personalizado
            </option>
            {atalhos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <input
            type="date"
            aria-label="Data inicial"
            className="h-9 rounded-lg border bg-card px-2 text-sm shadow-xs outline-none focus-visible:border-primary"
            value={filtros.periodo.inicio}
            min={dataMinima ?? undefined}
            max={filtros.periodo.fim}
            onChange={(e) => setPeriodo({ ...filtros.periodo, inicio: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <input
            type="date"
            aria-label="Data final"
            className="h-9 rounded-lg border bg-card px-2 text-sm shadow-xs outline-none focus-visible:border-primary"
            value={filtros.periodo.fim}
            min={filtros.periodo.inicio}
            max={dataMaxima ?? undefined}
            onChange={(e) => setPeriodo({ ...filtros.periodo, fim: e.target.value })}
          />
        </div>
      </Field>

      <Field label="Comparar com" htmlFor="comparacao">
        <Select
          id="comparacao"
          className="w-52"
          value={filtros.comparacao}
          onChange={(e) => onChange({ ...filtros, comparacao: e.target.value as Comparacao })}
        >
          <option value="periodo-anterior">Mesmo período anterior</option>
          <option value="ano-anterior">Mesmo período do ano anterior</option>
        </Select>
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
