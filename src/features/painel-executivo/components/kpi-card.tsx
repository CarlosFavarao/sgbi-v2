import Icon from "@mdi/react";
import { mdiArrowDownBold, mdiArrowUpBold, mdiInformationOutline, mdiMinus } from "@mdi/js";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPontos, formatVariacao } from "../format";

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
    return <span className="text-sm text-muted-foreground">sem comparação</span>;
  }
  const neutro = Math.abs(value) < 0.05;
  const bom = value > 0 === maiorMelhor;
  const cor = neutro ? "text-muted-foreground" : bom ? "text-success" : "text-error";
  const icone = neutro ? mdiMinus : value > 0 ? mdiArrowUpBold : mdiArrowDownBold;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${cor}`}>
      <Icon path={icone} size={0.65} aria-hidden />
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
    <article className="flex min-w-0 flex-col rounded-2xl border bg-card p-4 text-card-foreground shadow-md">
      <div className="flex items-center gap-2.5">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
          <Icon path={icone} size={0.95} className={t.icon} aria-hidden />
        </div>
        <h3 className="min-w-0 truncate text-sm font-semibold" title={titulo}>
          {titulo}
        </h3>
        <span title={ajuda} className="shrink-0 cursor-help text-muted-foreground" aria-label={ajuda}>
          <Icon path={mdiInformationOutline} size={0.6} />
        </span>
        {badge && (
          <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      {carregando ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : (
        <>
          <div className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight">{valor}</div>
          {/* O minigráfico desce para a linha de baixo quando o card é estreito. */}
          <div className="mt-1 flex flex-1 flex-wrap items-end justify-between gap-x-2 gap-y-1">
            <div className="flex min-w-0 flex-col gap-0.5 text-sm text-muted-foreground">{linhas}</div>
            {grafico && <div className="ml-auto">{grafico}</div>}
          </div>
        </>
      )}
    </article>
  );
}

/** Mensagem no lugar do valor quando não há dados. */
export function SemDados({ children }: { children: ReactNode }) {
  return <span className="text-base font-medium text-muted-foreground">{children}</span>;
}
