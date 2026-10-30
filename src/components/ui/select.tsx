"use client";

import Icon from "@mdi/react";
import { mdiCheck, mdiChevronDown } from "@mdi/js";
import { Select as Radix } from "radix-ui";

export type SelectOption<T extends string> = { value: T; label: string; disabled?: boolean };

/** Select próprio (Radix): teclado, foco e posicionamento acessíveis, visual do BI. */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  className = "",
  id,
  "aria-label": ariaLabel,
}: {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <Radix.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <Radix.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`group flex h-9 items-center justify-between gap-2 rounded-lg border bg-card pl-3 pr-2 text-sm text-foreground shadow-xs outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:border-primary data-placeholder:text-muted-foreground ${className}`}
      >
        <span className="truncate">
          <Radix.Value placeholder={placeholder} />
        </span>
        <Radix.Icon asChild>
          <Icon
            path={mdiChevronDown}
            size={0.8}
            className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </Radix.Icon>
      </Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <Radix.Viewport>
            {options.map((option) => (
              <Radix.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-md pl-7 pr-3 text-sm outline-none data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-secondary data-[state=checked]:font-medium"
              >
                <Radix.ItemIndicator className="absolute left-2 inline-flex text-primary">
                  <Icon path={mdiCheck} size={0.65} />
                </Radix.ItemIndicator>
                <Radix.ItemText>{option.label}</Radix.ItemText>
              </Radix.Item>
            ))}
          </Radix.Viewport>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
