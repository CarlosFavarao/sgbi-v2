"use client";

import Icon from "@mdi/react";
import { mdiBullseyeArrow, mdiLockOutline, mdiCartOutline, mdiCashMultiple, mdiChartWaterfall, mdiClose, mdiMenu, mdiMenuOpen, mdiViewDashboardOutline } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { bloqueioDaTela, detalheDoBloqueio, tituloDoBloqueio, type Tela } from "@/lib/acesso";
import { sessaoQuery } from "@/lib/api";
import { AvisosBotao, AvisosProvider } from "./avisos";
import { Tooltip } from "./ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import { UsuarioMenu } from "./usuario-menu";

const NAV: { href: string; label: string; icon: string; tela: Tela }[] = [
  { href: "/", label: "Painel Executivo", icon: mdiViewDashboardOutline, tela: "painel-executivo" },
  { href: "/metas", label: "Metas", icon: mdiBullseyeArrow, tela: "metas" },
  { href: "/vendas", label: "Vendas", icon: mdiCartOutline, tela: "vendas" },
  { href: "/financeiro", label: "Fluxo de Caixa", icon: mdiCashMultiple, tela: "financeiro" },
  { href: "/financeiro/dfc", label: "DFC", icon: mdiChartWaterfall, tela: "dfc" },
];

const iconButton =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-header-foreground transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white";

function NavLinks({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const acesso = useQuery(sessaoQuery()).data?.acesso;
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((item) => {
        // Cada tela tem o próprio item: só a rota exata o deixa ativo (/financeiro não acende em /financeiro/dfc).
        const active = pathname === item.href;
        // Tela indisponível na plataforma ou sem permissão (D46): o item fica desabilitado, com o motivo.
        const bloqueio = acesso ? bloqueioDaTela(acesso, item.tela) : null;
        if (bloqueio) {
          return (
            <li key={item.href}>
              <Tooltip conteudo={`${tituloDoBloqueio(bloqueio)}. ${detalheDoBloqueio(bloqueio)}`} side="right">
                <span
                  tabIndex={0}
                  aria-disabled
                  aria-label={`${item.label}: ${tituloDoBloqueio(bloqueio)}`}
                  className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-[9px] text-sm font-medium opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Icon path={item.icon} size={0.75} className="shrink-0" aria-hidden />
                  <span
                    className={`flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}
                  >
                    {item.label}
                    <Icon path={mdiLockOutline} size={0.55} aria-hidden />
                  </span>
                </span>
              </Tooltip>
            </li>
          );
        }
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={expanded ? undefined : item.label}
              className={`flex h-9 items-center gap-3 rounded-lg px-[9px] text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                active ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <Icon path={item.icon} size={0.75} className="shrink-0" aria-hidden />
              {/* O rótulo não muda de tamanho: a barra só o recorta, sem reflow. */}
              <span
                className={`whitespace-nowrap transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}
              >
                {item.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Desktop: trilho fino de ícones que expande POR CIMA do conteúdo (não empurra
 * o layout, então os gráficos não se redesenham durante a animação).
 * Celular: barra mínima no topo + menu deslizante.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!expanded && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setExpanded(false);
      setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, mobileOpen]);

  return (
    <AvisosProvider>
    <div className="flex min-h-screen">
      {/* Reserva só a largura do trilho recolhido. */}
      <div aria-hidden className="hidden w-12 shrink-0 lg:block" />

      {/* Clique fora fecha a barra expandida. */}
      <div
        aria-hidden
        onClick={() => setExpanded(false)}
        className={`fixed inset-0 z-30 hidden bg-black/10 transition-opacity duration-200 lg:block ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-header px-1.5 py-2 text-header-foreground transition-[width,box-shadow] duration-200 ease-out will-change-[width] lg:flex ${
          expanded ? "w-56 shadow-2xl" : "w-12 shadow-md"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            aria-expanded={expanded}
            title={expanded ? "Recolher menu" : "Expandir menu"}
            className={iconButton}
          >
            <Icon path={expanded ? mdiMenuOpen : mdiMenu} size={0.85} />
          </button>
          <span
            className={`whitespace-nowrap text-base font-semibold transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"}`}
          >
            SGBI
          </span>
        </div>
        <nav aria-label="Módulos" className="flex-1">
          <NavLinks expanded={expanded} onNavigate={() => setExpanded(false)} />
        </nav>
        <div className="mb-1 flex flex-col gap-1">
          <AvisosBotao expandido={expanded} />
          <UsuarioMenu expandido={expanded} />
        </div>
        <div className="[&_button]:size-9 [&_button]:text-header-foreground [&_button:hover]:bg-white/10">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 bg-header px-2 text-header-foreground shadow-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            className={iconButton}
          >
            <Icon path={mdiMenu} size={1} />
          </button>
          <span className="text-lg font-semibold">SGBI</span>
          <div className="ml-auto flex items-center gap-1">
            <AvisosBotao lado="bottom" />
            <UsuarioMenu lado="bottom" />
          </div>
          <div className="[&_button]:text-header-foreground [&_button:hover]:bg-white/10">
            <ThemeToggle />
          </div>
        </header>

        {children}
      </div>

      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="menu-mobile"
        aria-label="Menu"
        inert={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-header px-3 py-3 text-header-foreground shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex h-10 items-center justify-between px-1.5">
          <span className="text-lg font-semibold">SGBI</span>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className={iconButton}>
            <Icon path={mdiClose} size={0.9} />
          </button>
        </div>
        <nav aria-label="Módulos">
          <NavLinks expanded onNavigate={() => setMobileOpen(false)} />
        </nav>
      </aside>
    </div>
    </AvisosProvider>
  );
}
