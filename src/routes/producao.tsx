import { createFileRoute } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/producao")({
  head: () => ({ meta: [{ title: "Produção — NOVRA" }] }),
  component: () => (
    <AppShell>
      <PageHeader title="Produção" description="Fichas técnicas de impressão por SKU." />
      <EmptyState
        icon={Factory}
        title="Módulo Produção — Fase 2"
        description="Fichas técnicas estilo OrcaSlicer com parâmetros de impressão, upload de STL/3MF/GCODE e cálculo de custo automático. Cada produto cadastrado já tem sua ficha criada; o editor visual completo chega na próxima fase."
      />
    </AppShell>
  ),
});
