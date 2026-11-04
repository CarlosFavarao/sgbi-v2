"use client";

import { FiliaisSelect } from "@/components/filtros/filiais-select";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { mesesDoPeriodo } from "../metas";
import { formatMesAno } from "@/lib/format";
import type { Filial } from "@/lib/filtros";
import type { FiltrosMetas, Origem } from "../types";

const ORIGENS: { value: Origem; label: string }[] = [
  { value: "todos", label: "PDV + Faturamento" },
  { value: "pdv", label: "PDV" },
  { value: "faturamento", label: "Faturamento" },
];

const TODOS = "todos";

/**
 * Mês de referência (meses com venda carregada e meses com meta), filial,
 * departamento e origem da venda.
 */
export function FiltrosMetasBar({
  filtros,
  onChange,
  filiais,
  dataMinima,
  dataMaxima,
  mesesComMeta,
  departamentos,
}: {
  filtros: FiltrosMetas;
  onChange: (filtros: FiltrosMetas) => void;
  filiais: Filial[];
  dataMinima: string | null;
  dataMaxima: string | null;
  mesesComMeta: string[];
  departamentos: { codigo: number; descricao: string }[];
}) {
  const comVenda = dataMinima && dataMaxima ? mesesDoPeriodo({ inicio: dataMinima, fim: dataMaxima }) : [];
  const comMeta = new Set(mesesComMeta);
  const meses = [...new Set([...comVenda, ...mesesComMeta, filtros.mes])].sort().reverse();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Mês de referência">
        <Select
          aria-label="Mês de referência"
          className="w-48"
          value={filtros.mes}
          options={meses.map((m) => ({
            value: m,
            label: `${formatMesAno(m)}${comMeta.has(m) ? "" : " · sem meta"}`,
          }))}
          onValueChange={(mes) => onChange({ ...filtros, mes })}
        />
      </Field>

      <Field label="Filial">
        <FiliaisSelect filiais={filiais} value={filtros.filiais} onChange={(value) => onChange({ ...filtros, filiais: value })} />
      </Field>

      <Field label="Departamento">
        <Select
          aria-label="Departamento"
          className="w-48"
          value={filtros.departamento == null ? TODOS : String(filtros.departamento)}
          options={[
            { value: TODOS, label: "Todos" },
            ...departamentos.map((d) => ({ value: String(d.codigo), label: d.descricao })),
          ]}
          onValueChange={(v) => onChange({ ...filtros, departamento: v === TODOS ? null : Number(v) })}
        />
      </Field>

      <Field label="Origem da venda">
        <Segmented label="Origem da venda" value={filtros.origem} options={ORIGENS} onChange={(origem) => onChange({ ...filtros, origem })} />
      </Field>
    </div>
  );
}
