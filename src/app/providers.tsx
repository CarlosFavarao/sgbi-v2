"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetching right after hydration.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

function getQueryClient() {
  // Keep server requests isolated and preserve the browser cache across renders.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={getQueryClient()}>
        {/* Animações de movimento (Motion) respeitam "reduzir movimento" do sistema. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <ReactQueryDevtools buttonPosition="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
