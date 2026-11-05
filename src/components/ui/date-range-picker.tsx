"use client";

import Icon from "@mdi/react";
import { mdiCalendarMonthOutline, mdiChevronDown, mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/** Datas ISO (YYYY-MM-DD). */
export type IntervaloIso = { inicio: string; fim: string };

export type AtalhoIntervalo<Id extends string = string> = { id: Id; label: string; intervalo: IntervaloIso };

// O calendário trabalha com Date local; o resto do app com ISO.
function isoParaDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateParaIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Hover de um dia selecionado: a mesma cor, mais escura (não o cinza dos dias livres).
const HOVER_PONTA = "[&>button]:hover:bg-[color-mix(in_oklab,var(--primary),black_18%)]";

/** Mesmo limite da API (`server/params.ts`). */
const MAX_DIAS = 366;

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dias = (i: IntervaloIso) =>
  Math.round((isoParaDate(i.fim).getTime() - isoParaDate(i.inicio).getTime()) / 86_400_000) + 1;
const igual = (a?: IntervaloIso | null, b?: IntervaloIso | null) => !!a && !!b && a.inicio === b.inicio && a.fim === b.fim;

/**
 * Filtro de intervalo de datas: atalhos à esquerda (só preenchem o calendário)
 * e calendário de dois meses. Nada muda até "Aplicar".
 * `referencia` destaca em laranja outro intervalo (ex.: o Período, ao escolher a comparação).
 */
export function DateRangePicker<Id extends string>({
  value,
  onApply,
  atalhos,
  atalhoAplicado,
  referencia,
  dataMinima,
  dataMaxima,
  rotulo,
  legendaSelecao = "Selecionado",
  somenteAtalhoNoBotao = false,
}: {
  value: IntervaloIso;
  /** `atalho` = id do atalho usado, ou null quando as datas foram escolhidas à mão. */
  onApply: (intervalo: IntervaloIso, atalho: Id | null) => void;
  atalhos: AtalhoIntervalo<Id>[];
  /** Atalho que gerou o valor atual (mostrado no botão). */
  atalhoAplicado?: Id | null;
  referencia?: { intervalo: IntervaloIso; legenda: string };
  dataMinima?: string | null;
  dataMaxima?: string | null;
  /** Nome do filtro para leitores de tela (ex.: "Período"). */
  rotulo: string;
  legendaSelecao?: string;
  /** Com atalho aplicado, o botão mostra só o nome dele (as datas ficam no rótulo do filtro). */
  somenteAtalhoNoBotao?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<DateRange | undefined>();
  // Mês exibido (controlado, para os atalhos poderem navegar até a data).
  const [mes, setMes] = useState<Date>();
  // Atalho clicado por último (mantém o tipo relativo ao aplicar); some se as datas forem alteradas à mão.
  const [atalhoRascunho, setAtalhoRascunho] = useState<Id | null>(null);
  // Primeiro dia clicado: o segundo clique fecha o intervalo, antes ou depois dele,
  // mesmo navegando por vários meses entre os cliques.
  const [ancora, setAncora] = useState<Date | null>(null);
  const [diaSobMouse, setDiaSobMouse] = useState<Date | null>(null);

  const rotuloAplicado =
    atalhos.find((a) => a.id === atalhoAplicado)?.label ?? atalhos.find((a) => igual(a.intervalo, value))?.label;

  const abrir = (open: boolean) => {
    if (open) {
      setRascunho({ from: isoParaDate(value.inicio), to: isoParaDate(value.fim) });
      setMes(isoParaDate(value.inicio));
      setAtalhoRascunho(atalhoAplicado ?? null);
      setAncora(null);
    }
    setAberto(open);
  };

  const rascunhoIso =
    rascunho?.from && rascunho.to ? { inicio: dateParaIso(rascunho.from), fim: dateParaIso(rascunho.to) } : null;
  const atalhoAtivo = atalhos.find((a) => a.id === atalhoRascunho && igual(a.intervalo, rascunhoIso)) ??
    atalhos.find((a) => igual(a.intervalo, rascunhoIso));

  const clicarDia = (dia: Date) => {
    setAtalhoRascunho(null);
    if (!ancora) {
      setAncora(dia);
      setRascunho({ from: dia, to: undefined });
      return;
    }
    const [inicio, fim] = ancora <= dia ? [ancora, dia] : [dia, ancora];
    setRascunho({ from: inicio, to: fim });
    setAncora(null);
  };

  // Prévia do intervalo entre a âncora e o dia sob o mouse.
  const previa =
    ancora && diaSobMouse
      ? ancora <= diaSobMouse
        ? { from: ancora, to: diaSobMouse }
        : { from: diaSobMouse, to: ancora }
      : undefined;

  const longoDemais = !!rascunhoIso && dias(rascunhoIso) > MAX_DIAS;

  const escolherAtalho = (atalho: AtalhoIntervalo<Id>) => {
    setAncora(null);
    setAtalhoRascunho(atalho.id);
    setRascunho({ from: isoParaDate(atalho.intervalo.inicio), to: isoParaDate(atalho.intervalo.fim) });
    setMes(isoParaDate(atalho.intervalo.inicio));
  };

  const aplicar = () => {
    if (!rascunhoIso || longoDemais) return;
    onApply(rascunhoIso, atalhoAtivo?.id ?? null);
    setAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger
        aria-label={`${rotulo}: ${br(value.inicio)} a ${br(value.fim)}`}
        title={`${br(value.inicio)} – ${br(value.fim)}`}
        className="group flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-primary"
      >
        <Icon path={mdiCalendarMonthOutline} size={0.75} className="shrink-0 text-muted-foreground" />
        {somenteAtalhoNoBotao && rotuloAplicado ? (
          <span className="whitespace-nowrap font-medium">{rotuloAplicado}</span>
        ) : (
          <>
            {rotuloAplicado && <span className="whitespace-nowrap font-medium">{rotuloAplicado}:</span>}
            <span className="whitespace-nowrap tabular-nums">
              {br(value.inicio)} – {br(value.fim)}
            </span>
          </>
        )}
        <Icon
          path={mdiChevronDown}
          size={0.8}
          className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        />
      </PopoverTrigger>

      <PopoverContent className="flex flex-col sm:flex-row">
        <ul className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r">
          {atalhos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => escolherAtalho(a)}
                aria-pressed={a.id === atalhoAtivo?.id}
                className={`w-full whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                  a.id === atalhoAtivo?.id ? "bg-secondary font-medium text-primary" : ""
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
            // A seleção é controlada aqui (âncora + segundo clique), não pela regra padrão.
            onSelect={(_, dia) => clicarDia(dia)}
            onDayMouseEnter={(dia) => setDiaSobMouse(dia)}
            onDayMouseLeave={() => setDiaSobMouse(null)}
            month={mes}
            onMonthChange={setMes}
            startMonth={dataMinima ? isoParaDate(dataMinima) : undefined}
            endMonth={dataMaxima ? isoParaDate(dataMaxima) : undefined}
            disabled={[
              ...(dataMinima ? [{ before: isoParaDate(dataMinima) }] : []),
              ...(dataMaxima ? [{ after: isoParaDate(dataMaxima) }] : []),
            ]}
            showOutsideDays={false}
            modifiers={{
              ...(referencia && {
                referencia: { from: isoParaDate(referencia.intervalo.inicio), to: isoParaDate(referencia.intervalo.fim) },
              }),
              ...(previa && { previa }),
              // Primeiro clique: o intervalo ainda não existe, então o calendário não destaca o dia sozinho.
              ...(ancora && { ancora }),
            }}
            modifiersClassNames={{
              referencia: "bg-summary-orange-bg [&>button]:font-semibold [&>button]:text-warning [&>button]:hover:bg-warning/20",
              previa: "bg-primary/10",
              ancora: `rounded-md bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground! ${HOVER_PONTA}`,
            }}
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
              weekday: "size-9 text-xs font-medium capitalize text-muted-foreground",
              day: "size-9 p-0 text-center",
              day_button:
                "size-9 rounded-md tabular-nums outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50",
              today: "font-bold text-primary",
              range_start: `rounded-l-md bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground! ${HOVER_PONTA}`,
              range_end: `rounded-r-md bg-primary/15 [&>button]:bg-primary [&>button]:text-primary-foreground! ${HOVER_PONTA}`,
              range_middle: "bg-primary/15! [&>button]:rounded-none [&>button]:hover:bg-primary/30",
              disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
              outside: "invisible",
            }}
          />

          {referencia && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-summary-orange-bg ring-1 ring-warning/50" />
                {referencia.legenda}: {br(referencia.intervalo.inicio)} – {br(referencia.intervalo.fim)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-primary" />
                {legendaSelecao}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {ancora ? (
                `${br(dateParaIso(ancora))} · escolha o outro dia (antes ou depois)`
              ) : longoDemais ? (
                <span className="text-error">Máximo de {MAX_DIAS} dias ({dias(rascunhoIso!)} selecionados)</span>
              ) : rascunhoIso ? (
                `${br(rascunhoIso.inicio)} – ${br(rascunhoIso.fim)} · ${dias(rascunhoIso)} dias`
              ) : (
                "Escolha o dia inicial e o final"
              )}
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
                disabled={!rascunhoIso || longoDemais || !!ancora}
                onClick={aplicar}
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
