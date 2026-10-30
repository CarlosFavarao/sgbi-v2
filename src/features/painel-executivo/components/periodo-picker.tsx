"use client";

import Icon from "@mdi/react";
import { mdiCalendarMonthOutline, mdiChevronDown, mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, daysBetween, firstDayOfMonth, lastDayOfMonth } from "../date";
import { formatData } from "../format";
import type { Periodo } from "../types";

// O calendário trabalha com Date local; o resto do painel com ISO (YYYY-MM-DD).
function isoParaDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateParaIso(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

type Atalho = { id: string; label: string; periodo: Periodo };

/** Atalhos relativos ao último dia carregado (não a "hoje": os dados são D-1). */
function atalhos(dataMaxima: string | null): Atalho[] {
  if (!dataMaxima) return [];
  const mesAnterior = addDays(firstDayOfMonth(dataMaxima), -1);
  return [
    {
      id: "mes-anterior",
      label: "Último mês fechado",
      periodo: { inicio: firstDayOfMonth(mesAnterior), fim: lastDayOfMonth(mesAnterior) },
    },
    { id: "mes-atual", label: "Mês da última carga", periodo: { inicio: firstDayOfMonth(dataMaxima), fim: dataMaxima } },
    { id: "7-dias", label: "Últimos 7 dias", periodo: { inicio: addDays(dataMaxima, -6), fim: dataMaxima } },
    { id: "30-dias", label: "Últimos 30 dias", periodo: { inicio: addDays(dataMaxima, -29), fim: dataMaxima } },
    { id: "90-dias", label: "Últimos 90 dias", periodo: { inicio: addDays(dataMaxima, -89), fim: dataMaxima } },
  ];
}

const dias = (p: Periodo) => daysBetween(p.inicio, p.fim) + 1;

export function PeriodoPicker({
  value,
  onChange,
  dataMinima,
  dataMaxima,
}: {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
  dataMinima: string | null;
  dataMaxima: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<DateRange | undefined>();
  // Mês exibido no calendário (controlado, para os atalhos poderem navegar até a data).
  const [mes, setMes] = useState<Date>();
  const lista = atalhos(dataMaxima);
  const atalhoAtual = lista.find((a) => a.periodo.inicio === value.inicio && a.periodo.fim === value.fim);

  const abrir = (open: boolean) => {
    if (open) {
      setRascunho({ from: isoParaDate(value.inicio), to: isoParaDate(value.fim) });
      setMes(isoParaDate(value.inicio));
    }
    setAberto(open);
  };

  const aplicar = (periodo: Periodo) => {
    onChange(periodo);
    setAberto(false);
  };

  const rascunhoCompleto =
    rascunho?.from && rascunho.to ? { inicio: dateParaIso(rascunho.from), fim: dateParaIso(rascunho.to) } : null;
  const atalhoRascunho = lista.find(
    (a) => a.periodo.inicio === rascunhoCompleto?.inicio && a.periodo.fim === rascunhoCompleto?.fim,
  );

  // Atalho só preenche o calendário; quem aplica é o botão "Aplicar".
  const escolherAtalho = ({ inicio, fim }: Periodo) => {
    setRascunho({ from: isoParaDate(inicio), to: isoParaDate(fim) });
    setMes(isoParaDate(inicio));
  };

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger
        aria-label={`Período: ${formatData(value.inicio)} a ${formatData(value.fim)}`}
        className="group flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-primary"
      >
        <Icon path={mdiCalendarMonthOutline} size={0.75} className="shrink-0 text-muted-foreground" />
        {atalhoAtual && <span className="font-medium">{atalhoAtual.label}:</span>}
        <span className="whitespace-nowrap tabular-nums">
          {formatData(value.inicio)} – {formatData(value.fim)}
        </span>
        <Icon
          path={mdiChevronDown}
          size={0.8}
          className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        />
      </PopoverTrigger>

      <PopoverContent className="flex flex-col sm:flex-row">
        <ul className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r">
          {lista.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => escolherAtalho(a.periodo)}
                aria-pressed={a.id === atalhoRascunho?.id}
                className={`w-full whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                  a.id === atalhoRascunho?.id ? "bg-secondary font-medium text-primary" : ""
                }`}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="p-3">
          <DayPicker
            mode="range"
            locale={ptBR}
            numberOfMonths={2}
            selected={rascunho}
            onSelect={setRascunho}
            month={mes}
            onMonthChange={setMes}
            startMonth={dataMinima ? isoParaDate(dataMinima) : undefined}
            endMonth={dataMaxima ? isoParaDate(dataMaxima) : undefined}
            disabled={[
              ...(dataMinima ? [{ before: isoParaDate(dataMinima) }] : []),
              ...(dataMaxima ? [{ after: isoParaDate(dataMaxima) }] : []),
            ]}
            max={365}
            // Com um intervalo completo, o próximo clique começa um novo (em vez de estender).
            resetOnSelect
            showOutsideDays={false}
            components={{
              Chevron: ({ orientation }) => (
                <Icon path={orientation === "left" ? mdiChevronLeft : mdiChevronRight} size={0.8} />
              ),
            }}
            classNames={{
              root: "relative text-sm",
              months: "flex flex-col gap-4 sm:flex-row",
              month: "flex flex-col gap-2",
              month_caption: "flex h-8 items-center justify-center font-semibold capitalize",
              nav: "absolute inset-x-0 top-0 flex h-8 items-center justify-between",
              button_previous:
                "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30",
              button_next:
                "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30",
              month_grid: "border-collapse",
              weekdays: "",
              weekday: "size-9 text-xs font-medium capitalize text-muted-foreground",
              week: "",
              day: "size-9 p-0 text-center",
              day_button:
                "size-9 rounded-md tabular-nums outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50",
              today: "font-bold text-primary",
              selected: "",
              range_start: "rounded-l-md bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground",
              range_end: "rounded-r-md bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground",
              range_middle: "bg-primary/15 [&>button]:rounded-none",
              disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
              outside: "invisible",
            }}
          />

          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {rascunhoCompleto
                ? `${formatData(rascunhoCompleto.inicio)} – ${formatData(rascunhoCompleto.fim)} · ${dias(rascunhoCompleto)} dias`
                : "Escolha o dia inicial e o final"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="h-8 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rascunhoCompleto}
                onClick={() => rascunhoCompleto && aplicar(rascunhoCompleto)}
                className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
