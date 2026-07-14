import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart, Search, Save, Sparkles, Copy, ExternalLink, Tag,
  DollarSign, TrendingUp, Percent, Package, Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fichasComercialQuery } from "@/lib/queries";
import { gerarConteudoComercial } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type FichaRow = Database["public"]["Tables"]["ficha_comercial"]["Row"] & {
  produtos: {
    id: string; sku: string; nome: string; foto_url: string | null;
    categoria: string | null; peso_g: number | null; tempo_impressao_min: number | null;
    cor_principal: string | null; cor_secundaria: string | null;
    necessita_suportes: boolean | null; status: string;
  } | null;
};
type FichaUpdate = Database["public"]["Tables"]["ficha_comercial"]["Update"];

export const Route = createFileRoute("/comercial")({
  head: () => ({
    meta: [
      { title: "Comercial — NOVRA" },
      { name: "description", content: "Preços, margens e anúncios para Shopee e Mercado Livre com geração por IA." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(fichasComercialQuery());
  },
  component: ComercialPage,
});

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function ComercialPage() {
  const { data: fichas } = useSuspenseQuery(fichasComercialQuery());
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (fichas as FichaRow[]).filter((f) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        f.produtos?.nome.toLowerCase().includes(s) ||
        f.produtos?.sku.toLowerCase().includes(s) ||
        f.produtos?.categoria?.toLowerCase().includes(s)
      );
    });
  }, [fichas, q]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = (fichas as FichaRow[]).find((f) => f.id === selectedId) ?? null;

  return (
    <AppShell>
      <PageHeader
        title="Comercial"
        description="Preços, margens, títulos e descrições para Shopee e Mercado Livre — com geração automática por IA."
      />

      {fichas.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Nenhum produto cadastrado"
          description="Cadastre produtos em Produtos para começar a montar os anúncios."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Sidebar */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col max-h-[calc(100vh-13rem)]">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map((f) => {
                const preco = Number(f.preco ?? 0);
                const complete = preco > 0 && !!f.titulo_shopee && !!f.descricao_completa;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-3",
                      selectedId === f.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent",
                    )}
                  >
                    <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {f.produtos?.foto_url ? (
                        <img src={f.produtos.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.produtos?.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono">{f.produtos?.sku}</span>
                        {preco > 0 && <span>· {fmtBRL(preco)}</span>}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        complete ? "bg-emerald-500" : "bg-amber-500",
                      )}
                      title={complete ? "Anúncio completo" : "Anúncio incompleto"}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div>
            {selected ? (
              <FichaEditor key={selected.id} ficha={selected} />
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title="Selecione um produto"
                description="Escolha um produto na lista para editar o anúncio."
              />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FichaEditor({ ficha }: { ficha: FichaRow }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FichaUpdate>({
    titulo_shopee: ficha.titulo_shopee ?? "",
    titulo_mercadolivre: ficha.titulo_mercadolivre ?? "",
    preco: ficha.preco ?? 0,
    preco_promocional: ficha.preco_promocional ?? null,
    preco_minimo: ficha.preco_minimo ?? null,
    margem_percent: ficha.margem_percent ?? null,
    lucro: ficha.lucro ?? null,
    descricao_curta: ficha.descricao_curta ?? "",
    descricao_completa: ficha.descricao_completa ?? "",
    palavras_chave: ficha.palavras_chave ?? "",
    tags: ficha.tags ?? [],
    kit: ficha.kit ?? "",
    marketplace: ficha.marketplace ?? "ambos",
    status: ficha.status ?? "rascunho",
    link_shopee: ficha.link_shopee ?? "",
    link_mercadolivre: ficha.link_mercadolivre ?? "",
  });

  const gerar = useServerFn(gerarConteudoComercial);
  const [gerando, setGerando] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ficha_comercial").update(form).eq("id", ficha.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha comercial salva");
      qc.invalidateQueries({ queryKey: ["fichas-comercial"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleGerarIA() {
    if (!ficha.produtos) return;
    setGerando(true);
    try {
      const cores = [ficha.produtos.cor_principal, ficha.produtos.cor_secundaria].filter(Boolean) as string[];
      const result = await gerar({
        data: {
          nome: ficha.produtos.nome,
          sku: ficha.produtos.sku,
          categoria: ficha.produtos.categoria ?? undefined,
          peso_g: ficha.produtos.peso_g,
          tempo_min: ficha.produtos.tempo_impressao_min,
          cores,
          suportes: !!ficha.produtos.necessita_suportes,
          preco: Number(form.preco ?? 0) || null,
          marketplace: (["shopee", "mercadolivre", "ambos"].includes(form.marketplace as string)
            ? (form.marketplace as "shopee" | "mercadolivre" | "ambos")
            : "ambos"),
          observacoes: undefined,
        },
      });
      setForm((f) => ({
        ...f,
        titulo_shopee: result.titulo_shopee,
        titulo_mercadolivre: result.titulo_mercadolivre,
        descricao_curta: result.descricao_curta,
        descricao_completa: result.descricao_completa,
        palavras_chave: result.palavras_chave,
        tags: result.tags,
      }));
      toast.success("Conteúdo gerado — revise e salve");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar conteúdo");
    } finally {
      setGerando(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }

  const preco = Number(form.preco ?? 0);
  const margem = Number(form.margem_percent ?? 0);
  const custoEstimado = margem > 0 ? preco * (1 - margem / 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header do produto */}
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
          {ficha.produtos?.foto_url ? (
            <img src={ficha.produtos.foto_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate">{ficha.produtos?.nome}</div>
          <div className="text-sm text-muted-foreground font-mono">{ficha.produtos?.sku}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGerarIA} disabled={gerando} variant="outline" className="gap-2">
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Gerar com IA
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Precificação */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Precificação</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Preço de venda">
            <Input
              type="number"
              step="0.01"
              value={form.preco ?? ""}
              onChange={(e) => setForm({ ...form, preco: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Preço promocional">
            <Input
              type="number"
              step="0.01"
              value={form.preco_promocional ?? ""}
              onChange={(e) => setForm({ ...form, preco_promocional: Number(e.target.value) || null })}
            />
          </Field>
          <Field label="Preço mínimo">
            <Input
              type="number"
              step="0.01"
              value={form.preco_minimo ?? ""}
              onChange={(e) => setForm({ ...form, preco_minimo: Number(e.target.value) || null })}
            />
          </Field>
          <Field label="Margem %">
            <Input
              type="number"
              step="0.1"
              value={form.margem_percent ?? ""}
              onChange={(e) => setForm({ ...form, margem_percent: Number(e.target.value) || null })}
            />
          </Field>
        </div>
        {preco > 0 && margem > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
            <MiniStat icon={DollarSign} label="Custo estimado" value={fmtBRL(custoEstimado)} />
            <MiniStat icon={TrendingUp} label="Lucro por unidade" value={fmtBRL(preco - custoEstimado)} />
            <MiniStat icon={Percent} label="Margem" value={`${margem.toFixed(1)}%`} />
          </div>
        )}
      </div>

      {/* Anúncios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MarketplaceCard
          nome="Shopee"
          color="from-orange-500/10 to-red-500/5"
          titulo={form.titulo_shopee ?? ""}
          setTitulo={(v) => setForm({ ...form, titulo_shopee: v })}
          link={form.link_shopee ?? ""}
          setLink={(v) => setForm({ ...form, link_shopee: v })}
          maxTitulo={100}
          onCopy={() => copy(form.titulo_shopee ?? "", "Título Shopee")}
        />
        <MarketplaceCard
          nome="Mercado Livre"
          color="from-yellow-400/10 to-amber-500/5"
          titulo={form.titulo_mercadolivre ?? ""}
          setTitulo={(v) => setForm({ ...form, titulo_mercadolivre: v })}
          link={form.link_mercadolivre ?? ""}
          setLink={(v) => setForm({ ...form, link_mercadolivre: v })}
          maxTitulo={60}
          onCopy={() => copy(form.titulo_mercadolivre ?? "", "Título Mercado Livre")}
        />
      </div>

      {/* Descrições */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Conteúdo do anúncio</h3>
          </div>
          <Select
            value={form.marketplace ?? "ambos"}
            onValueChange={(v) => setForm({ ...form, marketplace: v as FichaUpdate["marketplace"] })}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Ambos</SelectItem>
              <SelectItem value="shopee">Shopee</SelectItem>
              <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Field label="Descrição curta (destaque)">
          <Textarea
            rows={2}
            value={form.descricao_curta ?? ""}
            onChange={(e) => setForm({ ...form, descricao_curta: e.target.value })}
            placeholder="2-3 frases de destaque..."
          />
        </Field>

        <Field
          label="Descrição completa"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copy(form.descricao_completa ?? "", "Descrição completa")}
              className="h-7 gap-1.5 text-xs"
            >
              <Copy className="w-3 h-3" /> Copiar
            </Button>
          }
        >
          <Textarea
            rows={10}
            value={form.descricao_completa ?? ""}
            onChange={(e) => setForm({ ...form, descricao_completa: e.target.value })}
            placeholder="Descrição rica com benefícios, especificações e CTA..."
            className="font-mono text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Palavras-chave (SEO)">
            <Textarea
              rows={3}
              value={form.palavras_chave ?? ""}
              onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })}
              placeholder="keyword1, keyword2, ..."
            />
          </Field>
          <Field label="Tags (separadas por vírgula)">
            <Textarea
              rows={3}
              value={(form.tags ?? []).join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                })
              }
              placeholder="tag1, tag2, ..."
            />
          </Field>
        </div>

        {(form.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(form.tags ?? []).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Field({
  label, children, action,
}: {
  label: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function MarketplaceCard({
  nome, color, titulo, setTitulo, link, setLink, maxTitulo, onCopy,
}: {
  nome: string; color: string; titulo: string; setTitulo: (v: string) => void;
  link: string; setLink: (v: string) => void; maxTitulo: number; onCopy: () => void;
}) {
  const over = titulo.length > maxTitulo;
  return (
    <div className={cn("rounded-2xl border border-border bg-gradient-to-br p-5 space-y-3", color)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{nome}</h3>
        <div className={cn("text-xs font-mono", over ? "text-destructive" : "text-muted-foreground")}>
          {titulo.length}/{maxTitulo}
        </div>
      </div>
      <Field
        label="Título"
        action={
          <Button size="sm" variant="ghost" onClick={onCopy} className="h-7 gap-1.5 text-xs">
            <Copy className="w-3 h-3" /> Copiar
          </Button>
        }
      >
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Field>
      <Field label="Link do anúncio">
        <div className="flex gap-2">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          {link && (
            <Button size="icon" variant="outline" asChild>
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </Field>
    </div>
  );
}
