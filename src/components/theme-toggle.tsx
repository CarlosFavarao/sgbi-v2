"use client";

import Icon from "@mdi/react";
import { mdiWeatherNight, mdiWhiteBalanceSunny } from "@mdi/js";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
    >
      {/* Both icons render; CSS picks one, so there is no hydration mismatch. */}
      <Icon path={mdiWeatherNight} size={0.9} className="dark:hidden" />
      <Icon path={mdiWhiteBalanceSunny} size={0.9} className="hidden dark:block" />
    </button>
  );
}
