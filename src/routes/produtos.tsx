import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Copy, Trash2, Pencil, Package, ImageIcon, X,
  Archive, ExternalLink, ShoppingBag, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { produtosQuery, type Produto, type ProdutoInsert } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(produtosQuery());
  },
  component: ProdutosPage,
});

const statusMeta: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  ideia: { label: "Ideia", className: "bg-muted text-muted-foreground" },
  pesquisando: { label: "Pesquisando", className: "bg-[oklch(0.75_0.15_260)]/15 text-[oklch(0.5_0.15_260)] dark:text-[oklch(0.8_0.15_260)]" },
  em_desenvolvimento: { label: "Em desenvolvimento", className: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.5_0.15_75)] dark:text-[oklch(0.8_0.15_75)]" },
  testando: { label: "Testando", className: "bg-[oklch(0.75_0.15_200)]/15 text-[oklch(0.5_0.15_200)] dark:text-[oklch(0.8_0.15_200)]" },
  em_teste: { label: "Em teste", className: "bg-primary/10 text-primary" },
  aprovado: { label: "Aprovado", className: "bg-[oklch(0.65_0.14_155)]/15 text-[oklch(0.45_0.14_155)] dark:text-[oklch(0.75_0.14_155)]" },
  publicado: { label: "Publicado", className: "bg-[oklch(0.55_0.18_155)]/20 text-[oklch(0.35_0.18_155)] dark:text-[oklch(0.75_0.18_155)]" },
  concluido: { label: "Concluído", className: "bg-[oklch(0.65_0.14_155)]/15 text-[oklch(0.45_0.14_155)] dark:text-[oklch(0.75_0.14_155)]" },
  pausado: { label: "Pausado", className: "bg-muted text-muted-foreground" },
  descontinuado: { label: "Descontinuado", className: "bg-destructive/10 text-destructive" },
};
const prioridadeMeta: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  media: { label: "Média", className: "bg-primary/10 text-primary" },
  alta: { label: "Alta", className: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.55_0.15_75)]" },
  urgente: { label: "Urgente", className: "bg-destructive/10 text-destructive" },
};

const STL_FONTES = ["MakerWorld", "Printables", "Thangs", "Cults3D", "Thingiverse", "Próprio", "Outro"];
const NIVEIS = ["Muito baixa", "Baixa", "Média", "Alta", "Muito alta"];
const DIFERENCIAIS = ["Design exclusivo", "Entrega rápida", "Personalização", "Compatibilidade específica"];

// Pesos da Nota NOVRA (soma = 100)
const NOTA_PESOS: Record<string, number> = {
  nota_procura: 15,
  nota_concorrencia: 12,
  nota_margem: 15,
  nota_tempo_maquina: 8,
  nota_facilidade: 8,
  nota_devolucao: 8,
  nota_escalabilidade: 12,
  nota_kits: 6,
  nota_tendencia: 6,
  nota_giro: 10,
};
const NOTA_LABELS: Record<string, string> = {
  nota_procura: "Procura",
  nota_concorrencia: "Concorrência",
  nota_margem: "Margem",
  nota_tempo_maquina: "Tempo de Máquina",
  nota_facilidade: "Facilidade de Impressão",
  nota_devolucao: "Chance de Devolução (invertido)",
  nota_escalabilidade: "Escalabilidade",
  nota_kits: "Potencial para Kits",
  nota_tendencia: "Dependência de Tendência (invertido)",
  nota_giro: "Potencial de Giro",
};

function calcularNotaFinal(form: Partial<ProdutoInsert>): number | null {
  let soma = 0;
  let pesoTotal = 0;
  for (const key of Object.keys(NOTA_PESOS)) {
    const v = (form as Record<string, unknown>)[key];
    if (typeof v === "number" && v >= 1 && v <= 10) {
      soma += (v / 10) * NOTA_PESOS[key];
      pesoTotal += NOTA_PESOS[key];
    }
  }
  if (pesoTotal === 0) return null;
  return Math.round((soma / pesoTotal) * 100 * 10) / 10;
}

function classificarNota(n: number | null): { label: string; className: string } {
  if (n === null) return { label: "Sem avaliação", className: "bg-muted text-muted-foreground" };
  if (n >= 90) return { label: "Excelente", className: "bg-[oklch(0.55_0.18_155)]/20 text-[oklch(0.35_0.18_155)] dark:text-[oklch(0.8_0.18_155)]" };
  if (n >= 80) return { label: "Muito Bom", className: "bg-[oklch(0.65_0.14_155)]/15 text-[oklch(0.45_0.14_155)] dark:text-[oklch(0.75_0.14_155)]" };
  if (n >= 70) return { label: "Bom", className: "bg-primary/10 text-primary" };
  if (n >= 60) return { label: "Testar", className: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.55_0.15_75)]" };
  return { label: "Não recomendado", className: "bg-destructive/10 text-destructive" };
}

function ProdutosPage() {
  const { data: produtos } = useSuspenseQuery(produtosQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("todos");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Produto | null>(null);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const arq = (p as unknown as { arquivado?: boolean }).arquivado ?? false;
      if (!mostrarArquivados && arq) return false;
      const matchQ = q === "" ||
        p.sku.toLowerCase().includes(q.toLowerCase()) ||
        p.nome.toLowerCase().includes(q.toLowerCase()) ||
        (p.categoria ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.linha ?? "").toLowerCase().includes(q.toLowerCase());
      const matchS = statusFilter === "todos" || p.status === statusFilter;
      const matchP = prioridadeFilter === "todos" || p.prioridade === prioridadeFilter;
      return matchQ && matchS && matchP;
    });
  }, [produtos, q, statusFilter, prioridadeFilter, mostrarArquivados]);

  const duplicar = useMutation({
    mutationFn: async (p: Produto) => {
      const novoSku = `${p.sku}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
      void _id; void _c; void _u;
      const { data, error } = await supabase.from("produtos").insert({ ...rest, sku: novoSku, nome: `${p.nome} (cópia)` }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produto duplicado com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao duplicar", { description: e.message }),
  });

  const arquivar = useMutation({
    mutationFn: async ({ p, arq }: { p: Produto; arq: boolean }) => {
      const { error } = await supabase.from("produtos").update({ arquivado: arq } as never).eq("id", p.id);
      if (error) throw error;
      return arq;
    },
    onSuccess: (arq) => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(arq ? "Produto arquivado" : "Produto desarquivado");
    },
    onError: (e: Error) => toast.error("Erro ao arquivar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (p: Produto) => {
      const { error } = await supabase.from("produtos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produto excluído");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  return (
    <AppShell>
      <PageHeader
        title="Produtos"
        description="Cadastro central de SKUs. Todas as fichas são criadas automaticamente."
        actions={
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar SKU, nome, categoria..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><Filter className="mr-2 h-3.5 w-3.5" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {Object.entries(statusMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas prioridades</SelectItem>
            {Object.entries(prioridadeMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <Switch checked={mostrarArquivados} onCheckedChange={setMostrarArquivados} />
          Arquivados
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={produtos.length === 0 ? "Nenhum produto cadastrado" : "Nenhum resultado"}
          description={produtos.length === 0 ? "Comece cadastrando seu primeiro SKU. As fichas técnica, comercial e de controle são criadas automaticamente." : "Ajuste os filtros ou a busca."}
          action={produtos.length === 0 && (
            <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Cadastrar produto</Button>
          )}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Nota</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((p) => {
                    const ext = p as unknown as Record<string, unknown>;
                    const arq = (ext.arquivado as boolean) ?? false;
                    const nota = (ext.nota_final as number | null) ?? null;
                    const cls = classificarNota(nota);
                    return (
                      <motion.tr
                        key={p.id} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={cn("border-b border-border/60 last:border-0 hover:bg-muted/30", arq && "opacity-60")}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                              {p.foto_url ? (
                                <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{p.nome}</div>
                              {p.linha && <div className="text-xs text-muted-foreground">{p.linha}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.categoria ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={cn("font-normal", statusMeta[p.status]?.className)}>
                            {statusMeta[p.status]?.label ?? p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={cn("font-normal", prioridadeMeta[p.prioridade]?.className)}>
                            {prioridadeMeta[p.prioridade]?.label ?? p.prioridade}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {nota !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold tabular-nums">{nota.toFixed(1)}</span>
                              <Badge variant="secondary" className={cn("font-normal", cls.className)}>{cls.label}</Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-0.5">
                            <LinkBtn href={ext.stl_link as string | undefined} label="Abrir STL" icon={<ExternalLink className="h-3.5 w-3.5" />} />
                            <LinkBtn href={ext.link_shopee as string | undefined} label="Abrir Shopee" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                            <LinkBtn href={ext.link_mercadolivre as string | undefined} label="Abrir Mercado Livre" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                            <LinkBtn href={ext.link_tiktok as string | undefined} label="Abrir TikTok" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                            <LinkBtn href={ext.link_amazon as string | undefined} label="Abrir Amazon" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                            <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => duplicar.mutate(p)} aria-label="Duplicar Produto">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => arquivar.mutate({ p, arq: !arq })} aria-label={arq ? "Desarquivar" : "Arquivar Produto"}>
                              <Archive className={cn("h-3.5 w-3.5", arq && "text-primary")} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} aria-label="Excluir">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProdutoDialog
        open={creating || !!editing}
        produto={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{deleting?.nome}</strong> e todas as suas fichas relacionadas
              (comercial, produção, controle, movimentações) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && excluir.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function LinkBtn({ href, label, icon }: { href?: string; label: string; icon: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
       className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      {icon}
    </a>
  );
}

function ProdutoDialog({
  open, produto, onClose,
}: { open: boolean; produto: Produto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<ProdutoInsert> & Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      setForm(produto ? { ...(produto as unknown as Record<string, unknown>) } : {
        sku: "", nome: "", status: "rascunho", prioridade: "media", necessita_suportes: false,
        material: "PLA",
      });
    }
  }, [open, produto]);

  const notaFinal = useMemo(() => calcularNotaFinal(form), [form]);
  const classificacao = classificarNota(notaFinal);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.sku || !form.nome) throw new Error("SKU e Nome são obrigatórios");
      const payload = { ...form, nota_final: notaFinal } as Record<string, unknown>;
      if (produto) {
        const { error } = await supabase.from("produtos").update(payload as never).eq("id", produto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["historico"] });
      toast.success(produto ? "Produto atualizado" : "Produto cadastrado", {
        description: produto ? undefined : "Fichas técnica, comercial e de controle criadas automaticamente.",
      });
      onClose();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string): number | null => (v === "" ? null : Number(v));

  const galeria = (form.galeria_imagens as string[] | undefined) ?? [];
  const setGaleria = (g: string[]) => set("galeria_imagens", g);
  const [novaImg, setNovaImg] = useState("");

  const diferenciais = (form.diferencial_tipos as string[] | undefined) ?? [];
  const toggleDiferencial = (d: string) => {
    const has = diferenciais.includes(d);
    set("diferencial_tipos", has ? diferenciais.filter((x) => x !== d) : [...diferenciais, d]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        {/* Bloco básico (mantido) */}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SKU *"><Input value={(form.sku as string) ?? ""} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="Ex: NVR-001" /></Field>
          <Field label="Nome *"><Input value={(form.nome as string) ?? ""} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do produto" /></Field>
          <Field label="Linha"><Input value={(form.linha as string) ?? ""} onChange={(e) => set("linha", e.target.value)} placeholder="Ex: Decoração" /></Field>
          <Field label="Categoria"><Input value={(form.categoria as string) ?? ""} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex: Vasos" /></Field>

          <Field label="Status do Produto">
            <Select value={(form.status as string) ?? "rascunho"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={(form.prioridade as string) ?? "media"} onValueChange={(v) => set("prioridade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(prioridadeMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Foto principal (URL)"><Input value={(form.foto_url as string) ?? ""} onChange={(e) => set("foto_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Dificuldade (1-5)"><Input type="number" min={1} max={5} value={(form.dificuldade as number | undefined) ?? ""} onChange={(e) => set("dificuldade", num(e.target.value))} /></Field>

          <Field label="Tempo impressão (min)"><Input type="number" value={(form.tempo_impressao_min as number | undefined) ?? ""} onChange={(e) => set("tempo_impressao_min", num(e.target.value))} /></Field>
          <Field label="Peso (g)"><Input type="number" step="0.1" value={(form.peso_g as number | undefined) ?? ""} onChange={(e) => set("peso_g", num(e.target.value))} /></Field>

          <Field label="Cor principal"><Input value={(form.cor_principal as string) ?? ""} onChange={(e) => set("cor_principal", e.target.value)} /></Field>
          <Field label="Cor secundária"><Input value={(form.cor_secundaria as string) ?? ""} onChange={(e) => set("cor_secundaria", e.target.value)} /></Field>

          <Field label="Acabamento"><Input value={(form.acabamento as string) ?? ""} onChange={(e) => set("acabamento", e.target.value)} /></Field>
          <Field label="Embalagem"><Input value={(form.embalagem as string) ?? ""} onChange={(e) => set("embalagem", e.target.value)} /></Field>

          <Field label="Link MakerWorld"><Input value={(form.link_makerworld as string) ?? ""} onChange={(e) => set("link_makerworld", e.target.value)} /></Field>
          <Field label="Link Printables"><Input value={(form.link_printables as string) ?? ""} onChange={(e) => set("link_printables", e.target.value)} /></Field>

          <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <Label className="text-sm">Necessita suportes</Label>
              <p className="text-xs text-muted-foreground">Marque se a impressão exige estruturas de suporte</p>
            </div>
            <Switch checked={!!form.necessita_suportes} onCheckedChange={(v) => set("necessita_suportes", v)} />
          </div>

          <div className="md:col-span-2">
            <Field label="Descrição"><Textarea rows={3} value={(form.descricao as string) ?? ""} onChange={(e) => set("descricao", e.target.value)} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Observações"><Textarea rows={2} value={(form.observacoes as string) ?? ""} onChange={(e) => set("observacoes", e.target.value)} /></Field>
          </div>
        </div>

        {/* Accordion Inteligência de Mercado (fechado por padrão) */}
        <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border bg-muted/20 px-4">
          <AccordionItem value="mercado" className="border-b-0">
            <AccordionTrigger className="text-sm font-semibold">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                INTELIGÊNCIA DE MERCADO
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              {/* STL */}
              <Section title="STL">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fonte STL">
                    <Select value={(form.stl_fonte as string) ?? ""} onValueChange={(v) => set("stl_fonte", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {STL_FONTES.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Link STL"><Input value={(form.stl_link as string) ?? ""} onChange={(e) => set("stl_link", e.target.value)} placeholder="https://..." /></Field>
                  <Field label="Autor"><Input value={(form.stl_autor as string) ?? ""} onChange={(e) => set("stl_autor", e.target.value)} /></Field>
                  <Field label="Tipo de licença"><Input value={(form.stl_tipo_licenca as string) ?? ""} onChange={(e) => set("stl_tipo_licenca", e.target.value)} placeholder="Ex: CC-BY, Comercial..." /></Field>
                  <Field label="Fornecedor da Licença"><Input value={(form.fornecedor_licenca as string) ?? ""} onChange={(e) => set("fornecedor_licenca", e.target.value)} /></Field>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <Label className="text-sm">Licença Comercial</Label>
                    <Switch checked={!!form.stl_licenca_comercial} onCheckedChange={(v) => set("stl_licenca_comercial", v)} />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Observações STL"><Textarea rows={2} value={(form.stl_observacoes as string) ?? ""} onChange={(e) => set("stl_observacoes", e.target.value)} /></Field>
                  </div>
                </div>
              </Section>

              {/* Mercado */}
              <Section title="MERCADO">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Preço Shopee (R$)"><Input type="number" step="0.01" value={(form.preco_shopee as number | undefined) ?? ""} onChange={(e) => set("preco_shopee", num(e.target.value))} /></Field>
                  <Field label="Preço Mercado Livre (R$)"><Input type="number" step="0.01" value={(form.preco_mercadolivre as number | undefined) ?? ""} onChange={(e) => set("preco_mercadolivre", num(e.target.value))} /></Field>
                  <Field label="Preço TikTok Shop (R$)"><Input type="number" step="0.01" value={(form.preco_tiktok as number | undefined) ?? ""} onChange={(e) => set("preco_tiktok", num(e.target.value))} /></Field>
                  <Field label="Preço Amazon (R$)"><Input type="number" step="0.01" value={(form.preco_amazon as number | undefined) ?? ""} onChange={(e) => set("preco_amazon", num(e.target.value))} /></Field>
                  <div className="md:col-span-2">
                    <Field label="Preço sugerido NOVRA (R$)"><Input type="number" step="0.01" value={(form.preco_novra_sugerido as number | undefined) ?? ""} onChange={(e) => set("preco_novra_sugerido", num(e.target.value))} /></Field>
                  </div>
                  <Field label="Link Shopee"><Input value={(form.link_shopee as string) ?? ""} onChange={(e) => set("link_shopee", e.target.value)} /></Field>
                  <Field label="Link Mercado Livre"><Input value={(form.link_mercadolivre as string) ?? ""} onChange={(e) => set("link_mercadolivre", e.target.value)} /></Field>
                  <Field label="Link TikTok"><Input value={(form.link_tiktok as string) ?? ""} onChange={(e) => set("link_tiktok", e.target.value)} /></Field>
                  <Field label="Link Amazon"><Input value={(form.link_amazon as string) ?? ""} onChange={(e) => set("link_amazon", e.target.value)} /></Field>
                </div>
              </Section>

              {/* Produção */}
              <Section title="PRODUÇÃO">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Material"><Input value={(form.material as string) ?? ""} onChange={(e) => set("material", e.target.value)} placeholder="PLA" /></Field>
                  <Field label="Quantidade de PLA (g)"><Input type="number" step="0.1" value={(form.quantidade_pla_g as number | undefined) ?? ""} onChange={(e) => set("quantidade_pla_g", num(e.target.value))} /></Field>
                  <Field label="Custo PLA (R$)"><Input type="number" step="0.01" value={(form.custo_pla as number | undefined) ?? ""} onChange={(e) => set("custo_pla", num(e.target.value))} /></Field>
                  <Field label="Energia (R$)"><Input type="number" step="0.01" value={(form.custo_energia as number | undefined) ?? ""} onChange={(e) => set("custo_energia", num(e.target.value))} /></Field>
                  <Field label="Desgaste (R$)"><Input type="number" step="0.01" value={(form.custo_desgaste as number | undefined) ?? ""} onChange={(e) => set("custo_desgaste", num(e.target.value))} /></Field>
                  <Field label="Embalagem (R$)"><Input type="number" step="0.01" value={(form.custo_embalagem as number | undefined) ?? ""} onChange={(e) => set("custo_embalagem", num(e.target.value))} /></Field>
                  <Field label="Frete subsidiado (R$)"><Input type="number" step="0.01" value={(form.frete_subsidiado as number | undefined) ?? ""} onChange={(e) => set("frete_subsidiado", num(e.target.value))} /></Field>
                  <Field label="Lucro líquido (R$)"><Input type="number" step="0.01" value={(form.lucro_liquido as number | undefined) ?? ""} onChange={(e) => set("lucro_liquido", num(e.target.value))} /></Field>
                  <Field label="Lucro por hora (R$/h)"><Input type="number" step="0.01" value={(form.lucro_por_hora as number | undefined) ?? ""} onChange={(e) => set("lucro_por_hora", num(e.target.value))} /></Field>
                </div>
              </Section>

              {/* Pesquisa */}
              <Section title="PESQUISA">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["saturacao", "Saturação"],
                    ["potencial_giro", "Potencial de Giro"],
                    ["recorrencia", "Recorrência"],
                    ["concorrencia_importados", "Concorrência de importados"],
                  ].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <Select value={(form[k] as string) ?? ""} onValueChange={(v) => set(k, v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {NIVEIS.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
                  <Field label="Data da última pesquisa">
                    <Input type="date" value={(form.data_ultima_pesquisa as string) ?? ""} onChange={(e) => set("data_ultima_pesquisa", e.target.value || null)} />
                  </Field>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <Label className="text-sm">Possui diferencial?</Label>
                    <Switch checked={!!form.possui_diferencial} onCheckedChange={(v) => set("possui_diferencial", v)} />
                  </div>
                </div>

                {form.possui_diferencial && (
                  <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
                    <Label className="text-xs font-medium text-muted-foreground">Tipos de diferencial</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {DIFERENCIAIS.map((d) => (
                        <label key={d} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={diferenciais.includes(d)} onCheckedChange={() => toggleDiferencial(d)} />
                          {d}
                        </label>
                      ))}
                    </div>
                    <Field label="Outro (descrever)">
                      <Input value={(form.diferencial_outro as string) ?? ""} onChange={(e) => set("diferencial_outro", e.target.value)} />
                    </Field>
                  </div>
                )}
              </Section>

              {/* Nota NOVRA */}
              <Section title="NOTA NOVRA">
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(NOTA_LABELS).map(([k, l]) => (
                    <Field key={k} label={`${l} (1-10) · peso ${NOTA_PESOS[k]}`}>
                      <Input type="number" min={1} max={10} value={(form[k] as number | undefined) ?? ""} onChange={(e) => set(k, num(e.target.value))} />
                    </Field>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Nota Final</p>
                    <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
                      {notaFinal !== null ? notaFinal.toFixed(1) : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn("text-sm font-normal", classificacao.className)}>
                    {classificacao.label}
                  </Badge>
                </div>
              </Section>

              {/* Galeria */}
              <Section title="GALERIA DE IMAGENS">
                <div className="flex gap-2">
                  <Input value={novaImg} onChange={(e) => setNovaImg(e.target.value)} placeholder="URL da imagem" />
                  <Button type="button" variant="secondary" onClick={() => {
                    if (novaImg.trim()) { setGaleria([...galeria, novaImg.trim()]); setNovaImg(""); }
                  }}>Adicionar</Button>
                </div>
                {galeria.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
                    {galeria.map((url, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                        <img src={url} alt={`Galeria ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setGaleria(galeria.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Observações internas */}
              <Section title="OBSERVAÇÕES INTERNAS">
                <Textarea rows={3} value={(form.observacoes_internas as string) ?? ""} onChange={(e) => set("observacoes_internas", e.target.value)} placeholder="Notas privadas visíveis apenas internamente" />
              </Section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" /> Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : produto ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
