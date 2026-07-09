import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Package, Sparkles, CheckCircle2, Flame, Boxes, DollarSign,
  FileText, ClipboardList, Factory, AlertTriangle, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Area, AreaChart,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { dashboardStatsQuery, historicoQuery, produtosQuery } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(dashboardStatsQuery());
    context.queryClient.ensureQueryData(historicoQuery());
    context.queryClient.ensureQueryData(produtosQuery());
  },
  component: DashboardPage,
});

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function DashboardPage() {
  const { data: stats } = useSuspenseQuery(dashboardStatsQuery());
  const { data: historico } = useSuspenseQuery(historicoQuery());
  const { data: produtos } = useSuspenseQuery(produtosQuery());

  // Timeline: novos produtos nos últimos 30 dias
  const now = Date.now();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const count = produtos.filter((p) => p.created_at.slice(0, 10) === key).length;
    return { day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), novos: count };
  });

  const alertas = [
    { cond: stats.sem_preco > 0, text: `${stats.sem_preco} produto(s) sem preço definido` },
    { cond: stats.sem_descricao > 0, text: `${stats.sem_descricao} produto(s) sem descrição` },
    { cond: stats.sem_ficha_producao > 0, text: `${stats.sem_ficha_producao} produto(s) sem parâmetros de impressão` },
    { cond: stats.sem_ficha_comercial > 0, text: `${stats.sem_ficha_comercial} produto(s) sem ficha comercial` },
  ].filter((a) => a.cond);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Visão geral do catálogo, produção e desempenho."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Produtos" value={stats.total} icon={Package} tone="primary" delay={0} />
        <StatCard label="Em desenvolvimento" value={stats.em_desenvolvimento} icon={Sparkles} tone="warning" delay={0.04} />
        <StatCard label="Concluídos" value={stats.concluidos} icon={CheckCircle2} tone="success" delay={0.08} />
        <StatCard label="Prioridade alta" value={stats.prioridade_alta} icon={Flame} tone="destructive" delay={0.12} />
        <StatCard label="Estoque total" value={stats.estoque} icon={Boxes} tone="primary" delay={0.16} />
        <StatCard label="Faturamento" value={fmtBRL(stats.faturamento)} icon={DollarSign} tone="success" delay={0.2} />
        <StatCard label="Sem preço" value={stats.sem_preco} icon={FileText} tone="warning" delay={0.24} />
        <StatCard label="Sem ficha produção" value={stats.sem_ficha_producao} icon={Factory} tone="warning" delay={0.28} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Faturamento" subtitle="Últimos períodos">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={days.map((d) => ({ ...d, valor: 0 }))}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="valor" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vendas" subtitle="Volume por dia">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days.map((d) => ({ ...d, vendas: 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="vendas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Novos produtos" subtitle="Últimos 14 dias">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="novos" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-5 shadow-elegant"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Últimas alterações</h3>
              <p className="text-xs text-muted-foreground">Registro em tempo real</p>
            </div>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </div>
          {historico.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
          ) : (
            <ul className="space-y-3">
              {historico.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <div className="text-sm text-foreground">{h.descricao}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5 shadow-elegant"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Alertas inteligentes</h3>
              <p className="text-xs text-muted-foreground">Ações recomendadas</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          {alertas.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-[oklch(0.65_0.14_155)]/10 p-3 text-sm text-[oklch(0.45_0.14_155)] dark:text-[oklch(0.8_0.14_155)]">
              <CheckCircle2 className="h-4 w-4" />
              Tudo em ordem por aqui.
            </div>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-[oklch(0.6_0.15_75)]" />
                  <span className="text-foreground">{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </AppShell>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="rounded-xl border border-border bg-card p-5 shadow-elegant"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}
