import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Trophy, Sparkles, Save, Calculator as CalcIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { produtosQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import {
  filamentosQuery, impressorasQuery, embalagensQuery, marketplacesQuery,
  energiaConfigQuery, produtoCustosQuery,
  calcularCusto, calcularPrecoMarketplace, precoMinimo, fmtBRL,
} from "@/lib/pricing";

export const Route = createFileRoute("/financeiro/simulador")({
  head: () => ({ meta: [{ title: "Simulador de Preços — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(produtosQuery());
    context.queryClient.ensureQueryData(filamentosQuery());
    context.queryClient.ensureQueryData(impressorasQuery());
    context.queryClient.ensureQueryData(embalagensQuery());
    context.queryClient.ensureQueryData(marketplacesQuery());
    context.queryClient.ensureQueryData(energiaConfigQuery());
    context.queryClient.ensureQueryData(produtoCustosQuery());
  },
  component: SimuladorPage,
});

function SimuladorPage() {
  const { data: produtos } = useSuspenseQuery(produtosQuery());
  const { data: filamentos } = useSuspenseQuery(filamentosQuery());
  const { data: impressoras } = useSuspenseQuery(impressorasQuery());
  const { data: embalagens } = useSuspenseQuery(embalagensQuery());
  const { data: marketplaces } = useSuspenseQuery(marketplacesQuery());
  const { data: energia } = useSuspenseQuery(energiaConfigQuery());
  const { data: produtoCustos } = useSuspenseQuery(produtoCustosQuery());
  const qc = useQueryClient();

  const [produtoId, setProdutoId] = useState<string>("__custom__");
  const [form, setForm] = useState({
    peso_peca_g: 50,
    tempo_impressao_min: 180,
    tempo_acabamento_min: 10,
    desperdicio_percent: 5,
    frete_estimado: 0,
    custos_extras: 0,
    lucro_desejado_percent: 35,
    filamento_id: filamentos[0]?.id ?? "",
    impressora_id: impressoras[0]?.id ?? "",
    embalagem_id: embalagens[0]?.id ?? "",
    preco_manual: 0,
  });

  // Carregar custos existentes ao trocar de produto
  useEffect(() => {
    if (produtoId === "__custom__") return;
    const existente = produtoCustos.find((c) => c.produto_id === produtoId);
    if (existente) {
      setForm((f) => ({
        ...f,
        peso_peca_g: Number(existente.peso_peca_g),
        tempo_impressao_min: Number(existente.tempo_impressao_min),
        tempo_acabamento_min: Number(existente.tempo_acabamento_min),
        desperdicio_percent: Number(existente.desperdicio_percent),
        frete_estimado: Number(existente.frete_estimado),
        custos_extras: Number(existente.custos_extras),
        lucro_desejado_percent: Number(existente.lucro_desejado_percent),
        filamento_id: existente.filamento_id ?? f.filamento_id,
        impressora_id: existente.impressora_id ?? f.impressora_id,
        embalagem_id: existente.embalagem_id ?? f.embalagem_id,
      }));
    }
  }, [produtoId, produtoCustos]);

  const filamento = filamentos.find((f) => f.id === form.filamento_id) ?? null;
  const impressora = impressoras.find((i) => i.id === form.impressora_id) ?? null;
  const embalagem = embalagens.find((e) => e.id === form.embalagem_id) ?? null;

  const custo = useMemo(
    () =>
      calcularCusto({
        peso_peca_g: form.peso_peca_g,
        tempo_impressao_min: form.tempo_impressao_min,
        tempo_acabamento_min: form.tempo_acabamento_min,
        desperdicio_percent: form.desperdicio_percent,
        frete_estimado: form.frete_estimado,
        custos_extras: form.custos_extras,
        lucro_desejado_percent: form.lucro_desejado_percent,
        filamento, impressora, embalagem, energia,
      }),
    [form, filamento, impressora, embalagem, energia],
  );

  const precos = useMemo(
    () => marketplaces.map((m) => calcularPrecoMarketplace(custo.custo_total, form.lucro_desejado_percent, m)),
    [marketplaces, custo.custo_total, form.lucro_desejado_percent],
  );

  const precoMin = useMemo(() => {
    if (marketplaces.length === 0) return custo.custo_total;
    return Math.min(...marketplaces.map((m) => precoMinimo(custo.custo_total, m)));
  }, [marketplaces, custo.custo_total]);

  const maisRentavel = precos.reduce<typeof precos[number] | null>(
    (best, p) => (best === null || p.lucro_liquido > best.lucro_liquido ? p : best),
    null,
  );

  const horas = form.tempo_impressao_min / 60;
  const rentabilidadeHora = maisRentavel && horas > 0 ? maisRentavel.lucro_liquido / horas : 0;

  const abaixoDoMinimo = form.preco_manual > 0 && form.preco_manual < precoMin;

  const salvar = useMutation({
    mutationFn: async () => {
      if (produtoId === "__custom__") throw new Error("Selecione um produto para salvar");
      const payload = {
        produto_id: produtoId,
        filamento_id: form.filamento_id || null,
        impressora_id: form.impressora_id || null,
        embalagem_id: form.embalagem_id || null,
        peso_peca_g: form.peso_peca_g,
        tempo_impressao_min: form.tempo_impressao_min,
        tempo_acabamento_min: form.tempo_acabamento_min,
        desperdicio_percent: form.desperdicio_percent,
        lucro_desejado_percent: form.lucro_desejado_percent,
        frete_estimado: form.frete_estimado,
        custos_extras: form.custos_extras,
      };
      const { error } = await supabase.from("produto_custos").upsert(payload, { onConflict: "produto_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custos salvos no produto");
      qc.invalidateQueries({ queryKey: ["produto_custos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        title="Simulador de Preços"
        description="Cálculo em tempo real com filamento, energia, depreciação, embalagem, frete e marketplaces."
        actions={
          <Button size="sm" onClick={() => salvar.mutate()} disabled={produtoId === "__custom__" || salvar.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> Salvar no produto
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Custo total" value={fmtBRL(custo.custo_total)} icon={CalcIcon} tone="primary" />
        <StatCard label="Preço mínimo" value={fmtBRL(precoMin)} icon={AlertTriangle} tone="warning" />
        <StatCard label="Mais rentável" value={maisRentavel ? fmtBRL(maisRentavel.preco_sugerido) : "—"} icon={Trophy} tone="success" hint={maisRentavel?.marketplace.nome} />
        <StatCard label="R$/hora de impressora" value={fmtBRL(rentabilidadeHora)} icon={Clock} tone="primary" hint={`${horas.toFixed(1)}h`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* ESQUERDA — Entradas */}
        <motion.section
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-elegant"
        >
          <div>
            <h3 className="text-sm font-semibold">Parâmetros</h3>
            <p className="text-xs text-muted-foreground">Tudo é recalculado automaticamente.</p>
          </div>

          <Field label="Produto">
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">— Simulação livre —</SelectItem>
                {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} · {p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso da peça (g)">
              <Input type="number" step="0.1" value={form.peso_peca_g} onChange={(e) => setForm({ ...form, peso_peca_g: Number(e.target.value) })} />
            </Field>
            <Field label="Desperdício (%)">
              <Input type="number" step="0.1" value={form.desperdicio_percent} onChange={(e) => setForm({ ...form, desperdicio_percent: Number(e.target.value) })} />
            </Field>
            <Field label="Tempo impressão (min)">
              <Input type="number" value={form.tempo_impressao_min} onChange={(e) => setForm({ ...form, tempo_impressao_min: Number(e.target.value) })} />
            </Field>
            <Field label="Acabamento (min)">
              <Input type="number" value={form.tempo_acabamento_min} onChange={(e) => setForm({ ...form, tempo_acabamento_min: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Filamento">
            <Select value={form.filamento_id} onValueChange={(v) => setForm({ ...form, filamento_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um filamento" /></SelectTrigger>
              <SelectContent>
                {filamentos.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome} · {f.material}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Impressora">
            <Select value={form.impressora_id} onValueChange={(v) => setForm({ ...form, impressora_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione uma impressora" /></SelectTrigger>
              <SelectContent>
                {impressoras.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Embalagem">
            <Select value={form.embalagem_id} onValueChange={(v) => setForm({ ...form, embalagem_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione uma embalagem" /></SelectTrigger>
              <SelectContent>
                {embalagens.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome} · {fmtBRL(Number(e.valor_unitario))}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frete estimado (R$)">
              <Input type="number" step="0.01" value={form.frete_estimado} onChange={(e) => setForm({ ...form, frete_estimado: Number(e.target.value) })} />
            </Field>
            <Field label="Custos extras (R$)">
              <Input type="number" step="0.01" value={form.custos_extras} onChange={(e) => setForm({ ...form, custos_extras: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label={`Lucro desejado: ${form.lucro_desejado_percent}%`}>
            <Input type="number" step="1" value={form.lucro_desejado_percent} onChange={(e) => setForm({ ...form, lucro_desejado_percent: Number(e.target.value) })} />
          </Field>

          <div className="border-t border-border pt-4">
            <Field label="Simular preço manual (R$)">
              <Input type="number" step="0.01" value={form.preco_manual} onChange={(e) => setForm({ ...form, preco_manual: Number(e.target.value) })} placeholder="Ex: 39,90" />
            </Field>
            {abaixoDoMinimo && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Este preço gera prejuízo. Mínimo sem prejuízo: <strong>{fmtBRL(precoMin)}</strong></span>
              </div>
            )}
          </div>
        </motion.section>

        {/* DIREITA — Resultados */}
        <motion.section
          initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="mb-4 text-sm font-semibold">Composição de custo</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              <Row label="Filamento" value={fmtBRL(custo.custo_filamento)} />
              <Row label="Desperdício" value={fmtBRL(custo.custo_desperdicio)} />
              <Row label="Energia" value={fmtBRL(custo.custo_energia)} />
              <Row label="Depreciação" value={fmtBRL(custo.custo_depreciacao)} />
              <Row label="Embalagem" value={fmtBRL(custo.custo_embalagem)} />
              <Row label="Frete" value={fmtBRL(custo.frete)} />
              <Row label="Extras" value={fmtBRL(custo.extras)} />
              <div className="col-span-2 md:col-span-3 border-t border-border pt-3">
                <Row label="Custo total" value={fmtBRL(custo.custo_total)} bold />
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Comparador de marketplaces</h3>
                <p className="text-xs text-muted-foreground">Preço sugerido para lucro de {form.lucro_desejado_percent}%</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            {marketplaces.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Cadastre marketplaces em Financeiro › Marketplaces.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marketplace</TableHead>
                    <TableHead className="text-right">Preço sugerido</TableHead>
                    <TableHead className="text-right">Taxas</TableHead>
                    <TableHead className="text-right">Lucro líquido</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {precos.map((p) => {
                    const best = maisRentavel?.marketplace.id === p.marketplace.id;
                    return (
                      <TableRow key={p.marketplace.id} className={best ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {p.marketplace.nome}
                            {best && <Badge className="gap-1"><Sparkles className="h-3 w-3" />Mais rentável</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{fmtBRL(p.preco_sugerido)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBRL(p.taxas)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-primary">{fmtBRL(p.lucro_liquido)}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.margem_percent.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </motion.section>
      </div>

      {/* Ranking por rentabilidade/hora */}
      {produtoCustos.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-elegant">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Ranking: rentabilidade por hora de impressora</h3>
              <p className="text-xs text-muted-foreground">Considera o marketplace mais rentável de cada produto.</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <RankingRentabilidade />
        </div>
      )}
    </AppShell>
  );
}

function RankingRentabilidade() {
  const { data: produtoCustos } = useSuspenseQuery(produtoCustosQuery());
  const { data: filamentos } = useSuspenseQuery(filamentosQuery());
  const { data: impressoras } = useSuspenseQuery(impressorasQuery());
  const { data: embalagens } = useSuspenseQuery(embalagensQuery());
  const { data: marketplaces } = useSuspenseQuery(marketplacesQuery());
  const { data: energia } = useSuspenseQuery(energiaConfigQuery());

  const linhas = produtoCustos
    .map((pc) => {
      const filamento = filamentos.find((f) => f.id === pc.filamento_id) ?? null;
      const impressora = impressoras.find((i) => i.id === pc.impressora_id) ?? null;
      const embalagem = embalagens.find((e) => e.id === pc.embalagem_id) ?? null;
      const custo = calcularCusto({
        peso_peca_g: Number(pc.peso_peca_g),
        tempo_impressao_min: Number(pc.tempo_impressao_min),
        tempo_acabamento_min: Number(pc.tempo_acabamento_min),
        desperdicio_percent: Number(pc.desperdicio_percent),
        frete_estimado: Number(pc.frete_estimado),
        custos_extras: Number(pc.custos_extras),
        lucro_desejado_percent: Number(pc.lucro_desejado_percent),
        filamento, impressora, embalagem, energia,
      });
      const melhor = marketplaces
        .map((m) => calcularPrecoMarketplace(custo.custo_total, Number(pc.lucro_desejado_percent), m))
        .reduce<ReturnType<typeof calcularPrecoMarketplace> | null>(
          (b, p) => (!b || p.lucro_liquido > b.lucro_liquido ? p : b),
          null,
        );
      const horas = Number(pc.tempo_impressao_min) / 60;
      const rh = melhor && horas > 0 ? melhor.lucro_liquido / horas : 0;
      return { pc, custo, melhor, horas, rh };
    })
    .sort((a, b) => b.rh - a.rh);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Tempo</TableHead>
          <TableHead className="text-right">Custo</TableHead>
          <TableHead>Melhor marketplace</TableHead>
          <TableHead className="text-right">Lucro líquido</TableHead>
          <TableHead className="text-right">R$/hora</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((l, i) => {
          const p = (l.pc as unknown as { produtos?: { sku: string; nome: string } }).produtos;
          return (
            <TableRow key={l.pc.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{p ? `${p.sku} · ${p.nome}` : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{l.horas.toFixed(1)}h</TableCell>
              <TableCell className="text-right tabular-nums">{fmtBRL(l.custo.custo_total)}</TableCell>
              <TableCell>{l.melhor?.marketplace.nome ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums text-primary">{fmtBRL(l.melhor?.lucro_liquido ?? 0)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-primary">{fmtBRL(l.rh)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-semibold tabular-nums text-foreground" : "font-medium tabular-nums text-foreground"}>{value}</dd>
    </div>
  );
}
