"use client";

import Icon from "@mdi/react";
import { mdiCheck, mdiMinus } from "@mdi/js";
import { Checkbox as Radix } from "radix-ui";

/** Checkbox próprio; `checked="indeterminate"` mostra um traço. */
export function Checkbox({
  checked,
  onCheckedChange,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <Radix.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      className="flex size-4 shrink-0 items-center justify-center rounded border border-input bg-card text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
    >
      <Radix.Indicator>
        <Icon path={checked === "indeterminate" ? mdiMinus : mdiCheck} size={0.55} />
      </Radix.Indicator>
    </Radix.Root>
  );
}
