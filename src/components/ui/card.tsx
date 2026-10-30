import type { ComponentProps } from "react";

// Card do BI antigo (PainelCard): rounded-2xl, borda e shadow-md.
export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`flex flex-col rounded-2xl border bg-card text-card-foreground shadow-md ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-4 pt-3 ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ className = "", ...props }: ComponentProps<"h2">) {
  return <h2 className={`text-base font-semibold leading-tight ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: ComponentProps<"p">) {
  return <p className={`text-xs text-muted-foreground ${className}`} {...props} />;
}
