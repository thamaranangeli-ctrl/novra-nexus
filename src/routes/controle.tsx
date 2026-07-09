import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, ArrowDownRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { controlesQuery, movimentacoesQuery } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/controle")({
  head: () => ({ meta: [{ title: "Controle — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(controlesQuery());
    context.queryClient.ensureQueryData(movimentacoesQuery());
  },
  component: ControlePage,
});

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function ControlePage() {
  const { data: controles } = useSuspenseQuery(controlesQuery());
  const { data: movs } = useSuspenseQuery(movimentacoesQuery());

  if (controles.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Controle" description="Estoque, vendas e movimentações." />
        <EmptyState
          icon={BarChart3}
          title="Nenhum produto ainda"
          description="Cadastre produtos no módulo Produtos para começar a ver o controle de estoque."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Controle" description="Estoque, vendas, faturamento e histórico de movimentações." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-elegant lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Estoque por produto</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Produto</th>
                  <th className="py-2 font-medium text-right">Estoque</th>
                  <th className="py-2 font-medium text-right">Vendido</th>
                  <th className="py-2 font-medium text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {controles.map((c) => {
                  const p = (c as unknown as { produtos?: { sku: string; nome: string } | null }).produtos;
                  return (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5">
                        <div className="font-medium">{p?.nome ?? "—"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{p?.sku}</div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{c.estoque_atual}</td>
                      <td className="py-2.5 text-right tabular-nums">{c.quantidade_vendida}</td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">{fmtBRL(Number(c.faturamento))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
          <h3 className="mb-3 text-sm font-semibold">Movimentações recentes</h3>
          {movs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="space-y-3">
              {movs.slice(0, 10).map((m) => {
                const p = (m as unknown as { produtos?: { sku: string; nome: string } | null }).produtos;
                const positive = ["entrada", "producao", "ajuste"].includes(m.tipo);
                const Icon = m.tipo === "venda" ? ShoppingBag : positive ? ArrowUpRight : ArrowDownRight;
                return (
                  <li key={m.id} className="flex items-start gap-2">
                    <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md ${positive ? "bg-[oklch(0.65_0.14_155)]/10 text-[oklch(0.5_0.14_155)]" : "bg-destructive/10 text-destructive"}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium capitalize">{m.tipo} · {m.quantidade}</div>
                      <div className="text-xs text-muted-foreground">
                        {p?.nome} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
