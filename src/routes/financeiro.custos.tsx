import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Package as PackageIcon, Printer, Zap, Wallet, Boxes } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  filamentosQuery, impressorasQuery, embalagensQuery, custosFixosQuery, energiaConfigQuery,
  fmtBRL,
  type Filamento, type Impressora, type Embalagem, type CustoFixo,
} from "@/lib/pricing";

export const Route = createFileRoute("/financeiro/custos")({
  head: () => ({ meta: [{ title: "Custos Gerais — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(filamentosQuery());
    context.queryClient.ensureQueryData(impressorasQuery());
    context.queryClient.ensureQueryData(embalagensQuery());
    context.queryClient.ensureQueryData(custosFixosQuery());
    context.queryClient.ensureQueryData(energiaConfigQuery());
  },
  component: CustosPage,
});

function CustosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Custos Gerais"
        description="Configurações globais usadas em todos os cálculos de precificação."
      />
      <Tabs defaultValue="filamentos" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="filamentos"><PackageIcon className="mr-1.5 h-3.5 w-3.5" />Filamentos</TabsTrigger>
          <TabsTrigger value="impressoras"><Printer className="mr-1.5 h-3.5 w-3.5" />Impressoras</TabsTrigger>
          <TabsTrigger value="embalagens"><Boxes className="mr-1.5 h-3.5 w-3.5" />Embalagens</TabsTrigger>
          <TabsTrigger value="fixos"><Wallet className="mr-1.5 h-3.5 w-3.5" />Custos Fixos</TabsTrigger>
          <TabsTrigger value="energia"><Zap className="mr-1.5 h-3.5 w-3.5" />Energia</TabsTrigger>
        </TabsList>
        <TabsContent value="filamentos"><FilamentosTab /></TabsContent>
        <TabsContent value="impressoras"><ImpressorasTab /></TabsContent>
        <TabsContent value="embalagens"><EmbalagensTab /></TabsContent>
        <TabsContent value="fixos"><CustosFixosTab /></TabsContent>
        <TabsContent value="energia"><EnergiaTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ============================================================================
// FILAMENTOS
// ============================================================================
function FilamentosTab() {
  const { data } = useSuspenseQuery(filamentosQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Filamento | null>(null);
  const [del, setDel] = useState<Filamento | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("filamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Filamento removido");
      qc.invalidateQueries({ queryKey: ["filamentos"] });
      setDel(null);
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Filamentos cadastrados</h3>
          <p className="text-xs text-muted-foreground">Custo por grama calculado automaticamente.</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo filamento
        </Button>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum filamento cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead className="text-right">Custo total</TableHead>
              <TableHead className="text-right">R$/g</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((f) => {
              const total = Number(f.valor_pago) + Number(f.valor_frete);
              const porGrama = Number(f.peso_rolo_g) > 0 ? total / Number(f.peso_rolo_g) : 0;
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.marca ?? "—"}</TableCell>
                  <TableCell>{f.material ?? "—"}</TableCell>
                  <TableCell>{f.cor ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(f.peso_rolo_g)} g</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(total)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-primary">{fmtBRL(porGrama)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEdit(f); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDel(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <FilamentoDialog open={open} onOpenChange={setOpen} filamento={edit} />
      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover filamento?</AlertDialogTitle>
            <AlertDialogDescription>"{del?.nome}" será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove.mutate(del.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilamentoDialog({
  open, onOpenChange, filamento,
}: { open: boolean; onOpenChange: (v: boolean) => void; filamento: Filamento | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    nome: filamento?.nome ?? "",
    marca: filamento?.marca ?? "",
    material: filamento?.material ?? "PLA",
    cor: filamento?.cor ?? "",
    peso_rolo_g: filamento?.peso_rolo_g ?? 1000,
    valor_pago: filamento?.valor_pago ?? 0,
    valor_frete: filamento?.valor_frete ?? 0,
    fornecedor: filamento?.fornecedor ?? "",
    data_compra: filamento?.data_compra ?? "",
  }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        peso_rolo_g: Number(form.peso_rolo_g),
        valor_pago: Number(form.valor_pago),
        valor_frete: Number(form.valor_frete),
        data_compra: form.data_compra || null,
      };
      if (filamento) {
        const { error } = await supabase.from("filamentos").update(payload).eq("id", filamento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("filamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(filamento ? "Filamento atualizado" : "Filamento cadastrado");
      qc.invalidateQueries({ queryKey: ["filamentos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = Number(form.valor_pago) + Number(form.valor_frete);
  const porGrama = Number(form.peso_rolo_g) > 0 ? total / Number(form.peso_rolo_g) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{filamento ? "Editar filamento" : "Novo filamento"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
          <Field label="Material"><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} /></Field>
          <Field label="Cor"><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></Field>
          <Field label="Peso do rolo (g)"><Input type="number" value={form.peso_rolo_g} onChange={(e) => setForm({ ...form, peso_rolo_g: Number(e.target.value) })} /></Field>
          <Field label="Valor pago (R$)"><Input type="number" step="0.01" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })} /></Field>
          <Field label="Frete (R$)"><Input type="number" step="0.01" value={form.valor_frete} onChange={(e) => setForm({ ...form, valor_frete: Number(e.target.value) })} /></Field>
          <Field label="Fornecedor"><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></Field>
          <Field label="Data da compra"><Input type="date" value={form.data_compra ?? ""} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} /></Field>
        </div>
        <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Custo total</span><span className="font-medium tabular-nums">{fmtBRL(total)}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Custo por grama</span><span className="font-semibold tabular-nums text-primary">{fmtBRL(porGrama)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// IMPRESSORAS
// ============================================================================
function ImpressorasTab() {
  const { data } = useSuspenseQuery(impressorasQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Impressora | null>(null);
  const [del, setDel] = useState<Impressora | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impressoras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Impressora removida");
      qc.invalidateQueries({ queryKey: ["impressoras"] });
      setDel(null);
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Impressoras</h3>
          <p className="text-xs text-muted-foreground">Depreciação por hora calculada com base na vida útil.</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova impressora
        </Button>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma impressora cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Vida útil</TableHead>
              <TableHead className="text-right">Potência</TableHead>
              <TableHead className="text-right">Depreciação/h</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((f) => {
              const dep = Number(f.vida_util_horas) > 0 ? Number(f.valor_compra) / Number(f.vida_util_horas) : 0;
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.modelo ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(Number(f.valor_compra))}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(f.vida_util_horas)}h</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(f.potencia_watts)}W</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-primary">{fmtBRL(dep)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEdit(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDel(f)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <ImpressoraDialog open={open} onOpenChange={setOpen} impressora={edit} />
      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover impressora?</AlertDialogTitle>
            <AlertDialogDescription>"{del?.nome}" será excluída.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && remove.mutate(del.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImpressoraDialog({
  open, onOpenChange, impressora,
}: { open: boolean; onOpenChange: (v: boolean) => void; impressora: Impressora | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    nome: impressora?.nome ?? "",
    modelo: impressora?.modelo ?? "",
    valor_compra: impressora?.valor_compra ?? 0,
    vida_util_horas: impressora?.vida_util_horas ?? 10000,
    potencia_watts: impressora?.potencia_watts ?? 150,
  }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        valor_compra: Number(form.valor_compra),
        vida_util_horas: Number(form.vida_util_horas),
        potencia_watts: Number(form.potencia_watts),
      };
      if (impressora) {
        const { error } = await supabase.from("impressoras").update(payload).eq("id", impressora.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("impressoras").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["impressoras"] });
      onOpenChange(false);
    },
  });

  const dep = Number(form.vida_util_horas) > 0 ? Number(form.valor_compra) / Number(form.vida_util_horas) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{impressora ? "Editar impressora" : "Nova impressora"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
          <Field label="Valor de compra (R$)"><Input type="number" step="0.01" value={form.valor_compra} onChange={(e) => setForm({ ...form, valor_compra: Number(e.target.value) })} /></Field>
          <Field label="Vida útil (horas)"><Input type="number" value={form.vida_util_horas} onChange={(e) => setForm({ ...form, vida_util_horas: Number(e.target.value) })} /></Field>
          <Field label="Potência média (W)"><Input type="number" value={form.potencia_watts} onChange={(e) => setForm({ ...form, potencia_watts: Number(e.target.value) })} /></Field>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Depreciação por hora</span><span className="font-semibold tabular-nums text-primary">{fmtBRL(dep)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EMBALAGENS
// ============================================================================
function EmbalagensTab() {
  const { data } = useSuspenseQuery(embalagensQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Embalagem | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("embalagens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["embalagens"] }); },
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Embalagens e insumos</h3>
          <p className="text-xs text-muted-foreground">Caixa, plástico bolha, etiqueta, manual, brinde, etc.</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo item
        </Button>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma embalagem cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Valor unitário</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell>{e.tipo ?? "—"}</TableCell>
                <TableCell>{e.fornecedor ?? "—"}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{fmtBRL(Number(e.valor_unitario))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <EmbalagemDialog open={open} onOpenChange={setOpen} embalagem={edit} />
    </div>
  );
}

function EmbalagemDialog({
  open, onOpenChange, embalagem,
}: { open: boolean; onOpenChange: (v: boolean) => void; embalagem: Embalagem | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    nome: embalagem?.nome ?? "",
    tipo: embalagem?.tipo ?? "",
    valor_unitario: embalagem?.valor_unitario ?? 0,
    fornecedor: embalagem?.fornecedor ?? "",
  }));
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, valor_unitario: Number(form.valor_unitario) };
      if (embalagem) {
        const { error } = await supabase.from("embalagens").update(payload).eq("id", embalagem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("embalagens").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["embalagens"] }); onOpenChange(false); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{embalagem ? "Editar" : "Nova embalagem"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Tipo"><Input placeholder="caixa, bolha, etiqueta..." value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></Field>
          <Field label="Valor unitário (R$)"><Input type="number" step="0.01" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: Number(e.target.value) })} /></Field>
          <Field label="Fornecedor"><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CUSTOS FIXOS
// ============================================================================
function CustosFixosTab() {
  const { data } = useSuspenseQuery(custosFixosQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<CustoFixo | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos_fixos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["custos_fixos"] }); },
  });

  const total = data.reduce((a, c) => a + Number(c.valor_mensal), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Custos fixos mensais</h3>
          <p className="text-xs text-muted-foreground">Base para rateio futuro. Total: <span className="font-medium text-foreground">{fmtBRL(total)}</span>/mês</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo custo
        </Button>
      </div>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum custo fixo cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor mensal</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.categoria ?? "—"}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{fmtBRL(Number(c.valor_mensal))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <CustoFixoDialog open={open} onOpenChange={setOpen} custo={edit} />
    </div>
  );
}

function CustoFixoDialog({
  open, onOpenChange, custo,
}: { open: boolean; onOpenChange: (v: boolean) => void; custo: CustoFixo | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    nome: custo?.nome ?? "",
    categoria: custo?.categoria ?? "Internet",
    valor_mensal: custo?.valor_mensal ?? 0,
    observacoes: custo?.observacoes ?? "",
  }));
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, valor_mensal: Number(form.valor_mensal) };
      if (custo) {
        const { error } = await supabase.from("custos_fixos").update(payload).eq("id", custo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custos_fixos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["custos_fixos"] }); onOpenChange(false); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{custo ? "Editar" : "Novo custo fixo"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Categoria"><Input placeholder="Internet, Software, Contador..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></Field>
          <Field label="Valor mensal (R$)"><Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: Number(e.target.value) })} /></Field>
          <Field label="Observações"><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nome}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ENERGIA
// ============================================================================
function EnergiaTab() {
  const { data } = useSuspenseQuery(energiaConfigQuery());
  const qc = useQueryClient();
  const [valor, setValor] = useState(Number(data?.valor_kwh ?? 0.85));
  const save = useMutation({
    mutationFn: async () => {
      if (data) {
        const { error } = await supabase.from("energia_config").update({ valor_kwh: valor }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("energia_config").insert({ valor_kwh: valor });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["energia_config"] }); },
  });
  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-6 shadow-elegant">
      <h3 className="mb-1 text-sm font-semibold">Custo de energia</h3>
      <p className="mb-4 text-xs text-muted-foreground">Valor do kWh usado em todos os cálculos.</p>
      <Field label="Valor do kWh (R$)">
        <Input type="number" step="0.0001" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
      </Field>
      <Button className="mt-4 w-full" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
    </div>
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

// DialogTrigger not used directly but referenced to avoid unused import if bundled
export const __keep = DialogTrigger;
