import Icon from "@mdi/react";
import { mdiChevronDown } from "@mdi/js";
import type { ComponentProps } from "react";

/** `<select>` nativo com o visual dos filtros. */
export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border bg-card pl-3 pr-8 text-sm text-foreground shadow-xs outline-none transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
        {...props}
      >
        {children}
      </select>
      <Icon
        path={mdiChevronDown}
        size={0.8}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
