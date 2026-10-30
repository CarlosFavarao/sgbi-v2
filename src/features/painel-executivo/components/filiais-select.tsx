"use client";

import Icon from "@mdi/react";
import { mdiChevronDown, mdiStorefrontOutline } from "@mdi/js";
import { useEffect, useId, useRef, useState } from "react";
import type { Filial } from "../types";

export function FiliaisSelect({
  filiais,
  value,
  onChange,
}: {
  filiais: Filial[];
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-56 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-xs transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon path={mdiStorefrontOutline} size={0.75} className="shrink-0 text-muted-foreground" />
        <span className="truncate">{resumo}</span>
        <Icon path={mdiChevronDown} size={0.8} className="ml-auto shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-1 w-80 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-secondary">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={todas}
              onChange={() => onChange(todas ? [filiais[0].codigo] : filiais.map((f) => f.codigo))}
            />
            Todas as filiais
          </label>
          <div className="my-1 border-t" />
          <ul className="max-h-64 overflow-y-auto">
            {filiais.map((filial) => (
              <li key={filial.codigo}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={value.includes(filial.codigo)}
                    onChange={() => toggle(filial.codigo)}
                  />
                  <span className="w-6 text-right tabular-nums text-muted-foreground">
                    {filial.codigo}
                  </span>
                  <span className="truncate">{filial.descricao}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
