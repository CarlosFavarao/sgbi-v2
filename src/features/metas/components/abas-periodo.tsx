"use client";

import { formatData } from "@/lib/format";
import type { AbaPeriodo, PeriodoMeta } from "../types";

/** Seis abas de período relativas à data de referência (como as abas do print). */
export function AbasPeriodo({
  periodos,
  value,
  onChange,
  referencia,
}: {
  periodos: PeriodoMeta[];
  value: AbaPeriodo;
  onChange: (aba: AbaPeriodo) => void;
  referencia: string;
}) {
  return (
    <div role="tablist" aria-label="Período da meta" className="grid grid-cols-3 gap-2 sm:grid-cols-6 xl:flex">
      {periodos.map((p) => {
        const ativo = p.id === value;
        const descricao = p.id === "dia" ? `Ref. ${formatData(referencia).slice(0, 5)}` : p.descricao;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(p.id)}
            title={p.decorrido ? undefined : "Período ainda sem dados (aguardando)"}
            className={`flex h-11 min-w-28 flex-col items-center justify-center rounded-xl border px-4 text-xs leading-tight shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring xl:flex-1 xl:max-w-44 ${
              ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:border-primary/60 hover:text-primary"
            }`}
          >
            <span className="font-semibold">{p.label}</span>
            <span className={ativo ? "opacity-90" : "text-muted-foreground"}>{descricao}</span>
          </button>
        );
      })}
    </div>
  );
}
