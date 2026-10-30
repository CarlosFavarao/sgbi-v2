import Icon from "@mdi/react";
import { mdiViewDashboardOutline } from "@mdi/js";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

// Barra superior do BI antigo (components/Menu): azul #4B8CFF, 60px, texto branco.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 h-15 bg-header text-header-foreground shadow-lg">
      <div className="mx-auto flex h-full max-w-[2400px] items-center gap-6 px-3 lg:px-5">
        <span className="text-xl font-medium">SGBI</span>
        <nav aria-label="Módulos">
          <Link
            href="/"
            aria-current="page"
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium"
          >
            <Icon path={mdiViewDashboardOutline} size={0.8} aria-hidden />
            Painel Executivo
          </Link>
        </nav>
        <div className="ml-auto [&_button]:text-header-foreground [&_button:hover]:bg-white/15">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
