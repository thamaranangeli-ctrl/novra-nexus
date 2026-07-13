import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Factory,
  ShoppingCart,
  BarChart3,
  KanbanSquare,
  Settings,
  Moon,
  Sun,
  Search,
  Sparkles,
  Wallet,
  Store,
  Calculator,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/comercial", label: "Comercial", icon: ShoppingCart },
  { to: "/controle", label: "Controle", icon: BarChart3 },
  { to: "/roadmap", label: "Roadmap", icon: KanbanSquare },
];
const navFinanceiro: NavItem[] = [
  { to: "/financeiro/custos", label: "Custos Gerais", icon: Wallet },
  { to: "/financeiro/marketplaces", label: "Marketplaces", icon: Store },
  { to: "/financeiro/simulador", label: "Simulador de Preços", icon: Calculator },
];
const navSecundario: NavItem[] = [
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-elegant">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">NOVRA</div>
            <div className="text-[11px] text-muted-foreground">Impressão 3D</div>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => renderNavLink(item, pathname))}

          <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Financeiro
          </div>
          {navFinanceiro.map((item) => renderNavLink(item, pathname))}

          <div className="mt-2 border-t border-sidebar-border/60 pt-2">
            {navSecundario.map((item) => renderNavLink(item, pathname))}
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">v1.0 · Fase 1</div>
            <div className="mt-0.5">Fundação · Produtos · Dashboard</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar SKU, produto, categoria..."
              className="h-9 border-border/70 bg-muted/40 pl-9 text-sm shadow-none focus-visible:bg-card"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Alternar tema"
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
