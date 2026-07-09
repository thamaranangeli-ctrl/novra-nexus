import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/comercial")({
  head: () => ({ meta: [{ title: "Comercial — NOVRA" }] }),
  component: () => (
    <AppShell>
      <PageHeader title="Comercial" description="Preço, margem, anúncios Shopee e Mercado Livre." />
      <EmptyState
        icon={ShoppingCart}
        title="Módulo Comercial — Fase 2"
        description="Editor de preços, margens, títulos e descrições para cada marketplace, com geração automática via IA (Gemini) e botão para copiar o anúncio pronto."
      />
    </AppShell>
  ),
});
