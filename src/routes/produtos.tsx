import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Copy, Trash2, Pencil, Package, ImageIcon, X,
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
  em_desenvolvimento: { label: "Em desenvolvimento", className: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.5_0.15_75)] dark:text-[oklch(0.8_0.15_75)]" },
  em_teste: { label: "Em teste", className: "bg-primary/10 text-primary" },
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

function ProdutosPage() {
  const { data: produtos } = useSuspenseQuery(produtosQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Produto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Produto | null>(null);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const matchQ = q === "" ||
        p.sku.toLowerCase().includes(q.toLowerCase()) ||
        p.nome.toLowerCase().includes(q.toLowerCase()) ||
        (p.categoria ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.linha ?? "").toLowerCase().includes(q.toLowerCase());
      const matchS = statusFilter === "todos" || p.status === statusFilter;
      const matchP = prioridadeFilter === "todos" || p.prioridade === prioridadeFilter;
      return matchQ && matchS && matchP;
    });
  }, [produtos, q, statusFilter, prioridadeFilter]);

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
          <SelectTrigger className="w-44"><Filter className="mr-2 h-3.5 w-3.5" /><SelectValue placeholder="Status" /></SelectTrigger>
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
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((p) => (
                    <motion.tr
                      key={p.id} layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30"
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
                        <Badge variant="secondary" className={cn("font-normal", statusMeta[p.status].className)}>
                          {statusMeta[p.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn("font-normal", prioridadeMeta[p.prioridade].className)}>
                          {prioridadeMeta[p.prioridade].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => duplicar.mutate(p)} aria-label="Duplicar">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} aria-label="Excluir">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
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

function ProdutoDialog({
  open, produto, onClose,
}: { open: boolean; produto: Produto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<ProdutoInsert>>({});

  // reset on open
  useMemo(() => {
    if (open) {
      setForm(produto ? { ...produto } : {
        sku: "", nome: "", status: "rascunho", prioridade: "media", necessita_suportes: false,
      });
    }
  }, [open, produto]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.sku || !form.nome) throw new Error("SKU e Nome são obrigatórios");
      if (produto) {
        const { error } = await supabase.from("produtos").update(form).eq("id", produto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(form as ProdutoInsert);
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

  const set = <K extends keyof ProdutoInsert>(k: K, v: ProdutoInsert[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SKU *"><Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="Ex: NVR-001" /></Field>
          <Field label="Nome *"><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} placeholder="Nome do produto" /></Field>
          <Field label="Linha"><Input value={form.linha ?? ""} onChange={(e) => set("linha", e.target.value)} placeholder="Ex: Decoração" /></Field>
          <Field label="Categoria"><Input value={form.categoria ?? ""} onChange={(e) => set("categoria", e.target.value)} placeholder="Ex: Vasos" /></Field>

          <Field label="Status">
            <Select value={form.status ?? "rascunho"} onValueChange={(v) => set("status", v as ProdutoInsert["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={form.prioridade ?? "media"} onValueChange={(v) => set("prioridade", v as ProdutoInsert["prioridade"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(prioridadeMeta).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Foto (URL)"><Input value={form.foto_url ?? ""} onChange={(e) => set("foto_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Dificuldade (1-5)"><Input type="number" min={1} max={5} value={form.dificuldade ?? ""} onChange={(e) => set("dificuldade", e.target.value ? Number(e.target.value) : null)} /></Field>

          <Field label="Tempo impressão (min)"><Input type="number" value={form.tempo_impressao_min ?? ""} onChange={(e) => set("tempo_impressao_min", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Peso (g)"><Input type="number" step="0.1" value={form.peso_g ?? ""} onChange={(e) => set("peso_g", e.target.value ? Number(e.target.value) : null)} /></Field>

          <Field label="Cor principal"><Input value={form.cor_principal ?? ""} onChange={(e) => set("cor_principal", e.target.value)} /></Field>
          <Field label="Cor secundária"><Input value={form.cor_secundaria ?? ""} onChange={(e) => set("cor_secundaria", e.target.value)} /></Field>

          <Field label="Acabamento"><Input value={form.acabamento ?? ""} onChange={(e) => set("acabamento", e.target.value)} /></Field>
          <Field label="Embalagem"><Input value={form.embalagem ?? ""} onChange={(e) => set("embalagem", e.target.value)} /></Field>

          <Field label="Link MakerWorld"><Input value={form.link_makerworld ?? ""} onChange={(e) => set("link_makerworld", e.target.value)} /></Field>
          <Field label="Link Printables"><Input value={form.link_printables ?? ""} onChange={(e) => set("link_printables", e.target.value)} /></Field>

          <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <Label className="text-sm">Necessita suportes</Label>
              <p className="text-xs text-muted-foreground">Marque se a impressão exige estruturas de suporte</p>
            </div>
            <Switch checked={!!form.necessita_suportes} onCheckedChange={(v) => set("necessita_suportes", v)} />
          </div>

          <div className="md:col-span-2">
            <Field label="Descrição"><Textarea rows={3} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} /></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Observações"><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} /></Field>
          </div>
        </div>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
