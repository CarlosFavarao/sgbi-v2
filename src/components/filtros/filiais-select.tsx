"use client";

import Icon from "@mdi/react";
import { mdiChevronDown, mdiStorefrontOutline } from "@mdi/js";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Filial } from "@/lib/filtros";

export function FiliaisSelect({
  filiais,
  value,
  onChange,
}: {
  filiais: Filial[];
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const todas = value.length === filiais.length;
  const resumo = todas
    ? "Todas as filiais"
    : value.length === 1
      ? (filiais.find((f) => f.codigo === value[0])?.descricao ?? "1 filial")
      : `${value.length} filiais`;

  const toggle = (codigo: number) => {
    const next = value.includes(codigo) ? value.filter((c) => c !== codigo) : [...value, codigo];
    // Pelo menos uma filial precisa ficar selecionada.
    if (next.length) onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger className="group flex h-9 w-48 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-primary">
        <Icon path={mdiStorefrontOutline} size={0.75} className="shrink-0 text-muted-foreground" />
        <span className="truncate">{resumo}</span>
        <Icon
          path={mdiChevronDown}
          size={0.8}
          className="ml-auto shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <label className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm font-medium hover:bg-secondary">
          <Checkbox
            checked={todas ? true : "indeterminate"}
            onCheckedChange={() => onChange(todas ? [filiais[0].codigo] : filiais.map((f) => f.codigo))}
          />
          Todas as filiais
          <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
            {value.length}/{filiais.length}
          </span>
        </label>
        <div className="my-1 border-t" />
        <ul className="max-h-64 overflow-y-auto">
          {filiais.map((filial) => (
            <li key={filial.codigo}>
              <label className="flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-secondary">
                <Checkbox checked={value.includes(filial.codigo)} onCheckedChange={() => toggle(filial.codigo)} />
                <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{filial.codigo}</span>
                <span className="truncate">{filial.descricao}</span>
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
