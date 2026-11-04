import type { StatusMargem, StatusMeta } from "../types";

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const META: Record<StatusMeta, { label: string; ponto: string; fundo: string; texto: string }> = {
  acima: { label: "Acima", ponto: "bg-success", fundo: "bg-positive-highlight", texto: "text-success" },
  "no-ritmo": { label: "No ritmo", ponto: "bg-info", fundo: "bg-summary-blue-bg", texto: "text-info" },
  abaixo: { label: "Abaixo", ponto: "bg-error", fundo: "bg-negative-highlight", texto: "text-error" },
  aguardando: { label: "Aguardando", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
  "sem-meta": { label: "Sem meta", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
};

const MARGEM: Record<StatusMargem, { label: string; ponto: string; fundo: string; texto: string }> = {
  ok: { label: "Ok", ponto: "bg-success", fundo: "bg-positive-highlight", texto: "text-success" },
  atencao: { label: "Atenção", ponto: "bg-warning", fundo: "bg-summary-orange-bg", texto: "text-warning" },
  critico: { label: "Crítico", ponto: "bg-error", fundo: "bg-negative-highlight", texto: "text-error" },
  "sem-meta": { label: "Sem meta", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
};

export const ROTULO_STATUS = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label])) as Record<StatusMeta, string>;

function Selo({ s, destaque, compacto }: { s: (typeof META)[StatusMeta]; destaque?: boolean; compacto?: boolean }) {
  if (compacto) {
    // Tabelas pequenas: só o ponto e o texto, sem fundo (linha mais baixa).
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium ${s.texto}`} title={s.label}>
        <span className={`size-2 rounded-full ${s.ponto}`} aria-hidden />
        {/* Card estreito (container query): só o ponto; o texto fica no título e para leitores de tela. */}
        <span className="sr-only @[26rem]:not-sr-only">{s.label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 align-middle text-xs font-medium ${s.fundo} ${s.texto} ${destaque ? "px-3 py-1 text-sm font-semibold" : ""}`}
    >
      <span className={`size-1.5 rounded-full ${s.ponto}`} aria-hidden />
      {s.label}
    </span>
  );
}

/** Situação contra o ritmo da meta (com ponto colorido e texto, não só cor). */
export function StatusMetaBadge({
  status,
  destaque,
  compacto,
}: {
  status: StatusMeta;
  destaque?: boolean;
  compacto?: boolean;
}) {
  return <Selo s={META[status]} destaque={destaque} compacto={compacto} />;
}

export function StatusMargemBadge({ status }: { status: StatusMargem }) {
  return <Selo s={MARGEM[status]} />;
}
