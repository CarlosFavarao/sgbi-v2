import Icon from "@mdi/react";
import { mdiDatabaseOffOutline, mdiLockOutline } from "@mdi/js";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/tooltip";
import { detalheDoBloqueio, tituloDoBloqueio, type Bloqueio } from "@/lib/acesso";

const icone = (b: Bloqueio) => (b.motivo === "plataforma" ? mdiDatabaseOffOutline : mdiLockOutline);

/**
 * Card desabilitado (D46): a plataforma não envia os dados que ele usa ou o
 * usuário não tem permissão. Não busca nem mostra dados; na edição do layout
 * continua podendo ser movido e ocultado.
 */
export function CardBloqueado({ titulo, bloqueio }: { titulo: string; bloqueio: Bloqueio }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-4 pb-3 text-center">
        <Icon path={icone(bloqueio)} size={0.9} className="text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">{tituloDoBloqueio(bloqueio)}</p>
        <p className="max-w-80 text-xs text-muted-foreground [[data-baixo]_&]:hidden">{detalheDoBloqueio(bloqueio)}</p>
      </div>
    </Card>
  );
}

/** KPI desabilitado dentro de um bloco de KPIs (mesmo motivo do `CardBloqueado`, em formato compacto). */
export function KpiBloqueado({ titulo, bloqueio }: { titulo: string; bloqueio: Bloqueio }) {
  return (
    <Card className="justify-center gap-1 px-3 py-2">
      <p className="truncate text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Icon path={icone(bloqueio)} size={0.65} className="shrink-0" aria-hidden />
        <span className="truncate">{tituloDoBloqueio(bloqueio)}</span>
        <InfoTooltip texto={detalheDoBloqueio(bloqueio)} />
      </p>
    </Card>
  );
}
