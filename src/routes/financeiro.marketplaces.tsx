import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Store } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { marketplacesQuery, fmtBRL, type Marketplace } from "@/lib/pricing";

export const Route = createFileRoute("/financeiro/marketplaces")({
  head: () => ({ meta: [{ title: "Marketplaces — NOVRA" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(marketplacesQuery()),
  component: MarketplacesPage,
});

function MarketplacesPage() {
  const { data } = useSuspenseQuery(marketplacesQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Marketplace | null>(null);
  const [del, setDel] = useState<Marketplace | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["marketplaces"] }); setDel(null); },
  });

  return (
    <AppShell>
      <PageHeader
        title="Marketplaces"
        description="Comissões, taxas fixas e variáveis usadas no simulador de preços."
        actions={
          <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo marketplace
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
        {data.length === 0 ? (
          <div className="py-12 text-center">
            <Store className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum marketplace cadastrado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Taxa fixa</TableHead>
                <TableHead className="text-right">Taxa variável</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(m.comissao_percent)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(Number(m.taxa_fixa))}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(m.taxa_variavel_percent)}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.observacoes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEdit(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDel(m)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <MarketplaceDialog open={open} onOpenChange={setOpen} marketplace={edit} />
      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover marketplace?</AlertDialogTitle>
            <AlertDialogDescription>"{del?.nome}" será excluído.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove.mutate(del.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function MarketplaceDialog({
  open, onOpenChange, marketplace,
}: { open: boolean; onOpenChange: (v: boolean) => void; marketplace: Marketplace | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    nome: marketplace?.nome ?? "",
    comissao_percent: marketplace?.comissao_percent ?? 0,
    taxa_fixa: marketplace?.taxa_fixa ?? 0,
    taxa_variavel_percent: marketplace?.taxa_variavel_percent ?? 0,
    observacoes: marketplace?.observacoes ?? "",
  }));
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        comissao_percent: Number(form.comissao_percent),
        taxa_fixa: Number(form.taxa_fixa),
        taxa_variavel_percent: Number(form.taxa_variavel_percent),
      };
      if (marketplace) {
        const { error } = await supabase.from("marketplaces").update(payload).eq("id", marketplace.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketplaces").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["marketplaces"] }); onOpenChange(false); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{marketplace ? "Editar marketplace" : "Novo marketplace"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Comissão (%)</Label>
            <Input type="number" step="0.01" value={form.comissao_percent} onChange={(e) => setForm({ ...form, comissao_percent: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Taxa fixa (R$)</Label>
            <Input type="number" step="0.01" value={form.taxa_fixa} onChange={(e) => setForm({ ...form, taxa_fixa: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Taxa variável (%)</Label>
            <Input type="number" step="0.01" value={form.taxa_variavel_percent} onChange={(e) => setForm({ ...form, taxa_variavel_percent: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
