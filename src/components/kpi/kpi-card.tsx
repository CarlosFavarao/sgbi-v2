import { InfoTooltip } from "@/components/ui/tooltip";
import Icon from "@mdi/react";
import { mdiArrowDownBold, mdiArrowUpBold, mdiMinus } from "@mdi/js";
import type { ReactNode } from "react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatPontos, formatVariacao } from "@/lib/format";

export type Tom = "green" | "gold" | "pink" | "blue" | "purple" | "teal" | "orange" | "coral";

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const TONS: Record<Tom, { bg: string; icon: string; color: string }> = {
  green: { bg: "bg-summary-green-bg", icon: "text-summary-green-icon", color: "var(--summary-green-icon)" },
  gold: { bg: "bg-summary-gold-bg", icon: "text-summary-gold-icon", color: "var(--summary-gold-icon)" },
  pink: { bg: "bg-summary-pink-bg", icon: "text-summary-pink-icon", color: "var(--summary-pink-icon)" },
  blue: { bg: "bg-summary-blue-bg", icon: "text-summary-blue-icon", color: "var(--summary-blue-icon)" },
  purple: { bg: "bg-summary-purple-bg", icon: "text-summary-purple-icon", color: "var(--summary-purple-icon)" },
  teal: { bg: "bg-summary-teal-bg", icon: "text-summary-teal-icon", color: "var(--summary-teal-icon)" },
  orange: { bg: "bg-summary-orange-bg", icon: "text-summary-orange-icon", color: "var(--summary-orange-icon)" },
  coral: { bg: "bg-summary-coral-bg", icon: "text-summary-coral-icon", color: "var(--summary-coral-icon)" },
};

export function corDoTom(tom: Tom) {
  return TONS[tom].color;
}

/** Variação colorida pelo sentido bom/ruim, sempre com seta (não só cor). */
export function Delta({
  value,
  unidade,
  maiorMelhor,
}: {
  value: number | null;
  unidade: "%" | "pp";
  maiorMelhor: boolean;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">sem comparação</span>;
  }
  const neutro = Math.abs(value) < 0.005;
  const bom = value > 0 === maiorMelhor;
  const cor = neutro ? "text-muted-foreground" : bom ? "text-success" : "text-error";
  const icone = neutro ? mdiMinus : value > 0 ? mdiArrowUpBold : mdiArrowDownBold;
  return (
    // Texto inline (não flex): o número fica na mesma linha de base dos valores vizinhos
    // (em tabela, um inline-flex se alinha pela base do ícone e o texto "sobe").
    <span className={`whitespace-nowrap text-xs font-semibold tabular-nums ${cor}`}>
      <Icon path={icone} size={0.55} className="mr-0.5 inline-block align-[-0.15em]" aria-hidden />
      {unidade === "%" ? formatVariacao(value) : formatPontos(value)}
    </span>
  );
}

export function KpiCard({
  titulo,
  ajuda,
  icone,
  tom,
  valor,
  linhas,
  grafico,
  badge,
  carregando,
}: {
  titulo: string;
  ajuda: string;
  icone: string;
  tom: Tom;
  valor: ReactNode;
  /** Linhas abaixo do valor (variação, base de comparação, % da venda...). */
  linhas?: ReactNode;
  grafico?: ReactNode;
  badge?: string;
  carregando?: boolean;
}) {
  const t = TONS[tom];
  return (
    <article aria-busy={!!carregando} className="@container relative flex min-w-0 flex-col rounded-2xl border bg-card px-3 py-2.5 text-card-foreground shadow-md [[data-altura=minima]_&]:flex-row [[data-altura=minima]_&]:items-center [[data-altura=minima]_&]:gap-2 [[data-altura=minima]_&]:py-1">
      {/* Altura mínima (bloco da grade personalizável): título e valor na mesma linha. */}
      <div className="flex min-w-0 items-center gap-2 [[data-altura=minima]_&]:max-w-[50%] [[data-altura=minima]_&]:shrink-0">
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg [[data-altura=minima]_&]:hidden ${t.bg}`}>
          <Icon path={icone} size={0.75} className={t.icon} aria-hidden />
        </div>
        <h3 className="min-w-0 truncate text-[13px] font-semibold" title={titulo}>
          {titulo}
        </h3>
        <InfoTooltip texto={ajuda} />
        {badge && (
          <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground [[data-altura=minima]_&]:hidden">
            {badge}
          </span>
        )}
      </div>
      {/* Minigráfico ao lado do valor e da variação: o card fica mais baixo. */}
      <div className="mt-1 flex min-h-0 flex-1 items-end justify-between gap-2 [[data-altura=minima]_&]:mt-0 [[data-altura=minima]_&]:items-center [[data-altura=minima]_&]:justify-end">
        <div className="min-w-0 flex-1 [[data-altura=minima]_&]:text-right">
          {/* Valores com centavos são longos: fonte menor em cards estreitos (container query). */}
          <div className="truncate text-sm font-bold tabular-nums tracking-tight @[12rem]:text-base @[14rem]:text-lg @[16rem]:text-xl [[data-altura=minima]_&]:text-sm!">
            {valor}
          </div>
          <div className="flex min-h-4 min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground [[data-altura=baixa]_&]:hidden [[data-altura=minima]_&]:hidden">
            {linhas}
          </div>
        </div>
        {/* KPI estreito ou baixo (bloco da grade personalizável): sem minigráfico, para não apertar o valor. */}
        {grafico && (
          <div className="shrink-0 @max-[13rem]:hidden [[data-altura=baixa]_&]:hidden [[data-altura=minima]_&]:hidden">
            {grafico}
          </div>
        )}
      </div>
      {/* Cobre o card inteiro: os dados antigos (ou vazios) não ficam legíveis. */}
      <LoadingOverlay ativo={!!carregando} label={titulo} className="rounded-2xl" />
    </article>
  );
}

/** Mensagem no lugar do valor quando não há dados. */
export function SemDados({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground [[data-altura=minima]_&]:text-xs">{children}</span>;
}
