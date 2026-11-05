"use client";

import Icon from "@mdi/react";
import { mdiInformationOutline } from "@mdi/js";
import { Tooltip as Radix } from "radix-ui";
import type { ReactNode } from "react";

/** Quase imediata (o `title` do navegador demora cerca de 1 s). */
const ATRASO_MS = 80;

/** Balão de ajuda com o visual dos painéis do sistema; aparece ao passar o mouse ou focar o gatilho. */
export function Tooltip({
  conteudo,
  children,
  side = "top",
}: {
  conteudo: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Radix.Provider delayDuration={ATRASO_MS} skipDelayDuration={300}>
      <Radix.Root>
        <Radix.Trigger asChild>{children}</Radix.Trigger>
        <Radix.Portal>
          <Radix.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className="z-50 max-w-72 rounded-lg border bg-popover px-2.5 py-1.5 text-xs leading-snug text-popover-foreground shadow-lg"
          >
            {conteudo}
            <Radix.Arrow className="fill-popover stroke-border" width={10} height={5} />
          </Radix.Content>
        </Radix.Portal>
      </Radix.Root>
    </Radix.Provider>
  );
}

/** Ícone "i" que mostra a explicação no balão. Sem mudar o cursor. */
export function InfoTooltip({ texto, size = 0.6 }: { texto: string; size?: number }) {
  return (
    <Tooltip conteudo={texto}>
      <span
        tabIndex={0}
        role="img"
        aria-label={texto}
        className="inline-flex shrink-0 rounded-full text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon path={mdiInformationOutline} size={size} />
      </span>
    </Tooltip>
  );
}
