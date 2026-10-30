"use client";

import { Popover as Radix } from "radix-ui";
import type { ComponentProps } from "react";

export const Popover = Radix.Root;
export const PopoverTrigger = Radix.Trigger;
export const PopoverClose = Radix.Close;

/** Painel flutuante com o visual dos menus do BI. */
export function PopoverContent({
  className = "",
  align = "start",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={`z-50 rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none ${className}`}
        {...props}
      />
    </Radix.Portal>
  );
}
