"use client";

import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { daysBetween } from "../date";
import type { Comparacao, Filial, Filtros, Origem } from "../types";
import { FiliaisSelect } from "./filiais-select";
import { PeriodoPicker } from "./periodo-picker";

const ORIGENS: { value: Origem; label: string }[] = [
  { value: "todos", label: "PDV + Faturamento" },
  { value: "pdv", label: "PDV" },
  { value: "faturamento", label: "Faturamento" },
];

const COMPARACOES: { value: Comparacao; label: string }[] = [
  { value: "periodo-anterior", label: "Mesmo período anterior" },
  { value: "ano-anterior", label: "Mesmo período do ano anterior" },
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
  const dias = daysBetween(filtros.periodo.inicio, filtros.periodo.fim) + 1;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label={`Período · ${dias} ${dias === 1 ? "dia" : "dias"}`}>
        <PeriodoPicker
          value={filtros.periodo}
          onChange={(periodo) => onChange({ ...filtros, periodo })}
          dataMinima={dataMinima}
          dataMaxima={dataMaxima}
        />
      </Field>

      <Field label="Comparar com" htmlFor="comparacao">
        <Select
          id="comparacao"
          className="w-56"
          value={filtros.comparacao}
          options={COMPARACOES}
          onValueChange={(comparacao) => onChange({ ...filtros, comparacao })}
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
