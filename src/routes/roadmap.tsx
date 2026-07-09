import { createFileRoute } from "@tanstack/react-router";
import { KanbanSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/roadmap")({
  head: () => ({ meta: [{ title: "Roadmap — NOVRA" }] }),
  component: () => (
    <AppShell>
      <PageHeader title="Roadmap" description="Kanban de tarefas, checklists e anexos." />
      <EmptyState
        icon={KanbanSquare}
        title="Módulo Roadmap — Fase 3"
        description="Kanban drag-and-drop (Backlog · Em andamento · Concluído), checklists interativos e anexos por tarefa. As tabelas já existem no banco; a interface completa chega na próxima fase."
      />
    </AppShell>
  ),
});
