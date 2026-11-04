import Icon from "@mdi/react";
import { mdiDatabaseOffOutline } from "@mdi/js";

/** Bloco do print sem fonte de dados no banco do SGBI (cada uso aponta a pendência). */
export function NaoIntegrado({ titulo, detalhe }: { titulo: string; detalhe: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-4 text-center">
      <Icon path={mdiDatabaseOffOutline} size={0.9} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
      <p className="max-w-80 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}
