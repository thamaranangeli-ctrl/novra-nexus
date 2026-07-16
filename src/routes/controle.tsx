import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Filter, Search, MoreHorizontal, X, Copy, Edit,
  DollarSign, TrendingUp, ShoppingBag, Package, Receipt, Ban,
  Factory, Printer, PackageCheck, Truck, CheckCircle2, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { produtosQuery } from "@/lib/queries";
import { marketplacesQuery, fmtBRL } from "@/lib/pricing";

type Venda = Database["public"]["Tables"]["vendas"]["Row"];
type VendaItem = Database["public"]["Tables"]["venda_itens"]["Row"];
type VendaStatus = Database["public"]["Enums"]["venda_status"];

const MARKETPLACE_OPTIONS = [
  { value: "shopee", label: "Shopee" },
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "amazon", label: "Amazon" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const STATUS_LIST: { value: VendaStatus; label: string; tone: string }[] = [
  { value: "recebida",    label: "Recebida",    tone: "bg-primary/10 text-primary" },
  { value: "em_producao", label: "Em Produção", tone: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.55_0.15_75)] dark:text-[oklch(0.82_0.15_75)]" },
  { value: "impressa",    label: "Impressa",    tone: "bg-[oklch(0.7_0.14_220)]/15 text-[oklch(0.5_0.14_220)] dark:text-[oklch(0.8_0.14_220)]" },
  { value: "embalada",    label: "Embalada",    tone: "bg-[oklch(0.7_0.14_280)]/15 text-[oklch(0.5_0.14_280)] dark:text-[oklch(0.8_0.14_280)]" },
  { value: "enviada",     label: "Enviada",     tone: "bg-[oklch(0.7_0.14_180)]/15 text-[oklch(0.45_0.14_180)] dark:text-[oklch(0.8_0.14_180)]" },
  { value: "entregue",    label: "Entregue",    tone: "bg-[oklch(0.65_0.14_155)]/10 text-[oklch(0.5_0.14_155)] dark:text-[oklch(0.78_0.14_155)]" },
  { value: "cancelada",   label: "Cancelada",   tone: "bg-destructive/10 text-destructive" },
];

const statusMeta = (s: VendaStatus) => STATUS_LIST.find((x) => x.value === s)!;
const marketplaceLabel = (m: string) =>
  MARKETPLACE_OPTIONS.find((o) => o.value === m)?.label ?? m;

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------
const vendasQuery = () =>
  queryOptions({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*, venda_itens(*)")
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data as (Venda & { venda_itens: VendaItem[] })[];
    },
  });

// ----------------------------------------------------------------------------
// Route
// ----------------------------------------------------------------------------
export const Route = createFileRoute("/controle")({
  head: () => ({ meta: [{ title: "Controle — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(vendasQuery());
    context.queryClient.ensureQueryData(produtosQuery());
    context.queryClient.ensureQueryData(marketplacesQuery());
  },
  component: ControlePage,
});

// ============================================================================
// Page
// ============================================================================
function ControlePage() {
  const { data: vendas } = useSuspenseQuery(vendasQuery());
  const qc = useQueryClient();

  const [openForm, setOpenForm] = useState(false);
  const [editVenda, setEditVenda] = useState<(Venda & { venda_itens: VendaItem[] }) | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Venda | null>(null);

  // filtros
  const [fPeriod, setFPeriod] = useState<"7" | "30" | "90" | "365" | "all">("30");
  const [fMarketplace, setFMarketplace] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fCliente, setFCliente] = useState("");
  const [fProduto, setFProduto] = useState("");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      fPeriod === "all" ? 0 : now - Number(fPeriod) * 86400000;
    return vendas.filter((v) => {
      if (cutoff && new Date(v.data_venda).getTime() < cutoff) return false;
      if (fMarketplace !== "all" && v.marketplace !== fMarketplace) return false;
      if (fStatus !== "all" && v.status !== fStatus) return false;
      if (fCliente.trim() && !(v.cliente_nome ?? "").toLowerCase().includes(fCliente.toLowerCase())) return false;
      if (fProduto.trim()) {
        const needle = fProduto.toLowerCase();
        const has = v.venda_itens.some(
          (it) => it.nome_snapshot.toLowerCase().includes(needle) || it.sku_snapshot.toLowerCase().includes(needle),
        );
        if (!has) return false;
      }
      return true;
    });
  }, [vendas, fPeriod, fMarketplace, fStatus, fCliente, fProduto]);

  const indicators = useMemo(() => {
    const active = filtered.filter((v) => v.status !== "cancelada");
    const receita = active.reduce((a, v) => a + Number(v.receita_bruta), 0);
    const lucro = active.reduce((a, v) => a + Number(v.lucro_liquido), 0);
    const pedidos = active.length;
    const produtos = active.reduce(
      (a, v) => a + v.venda_itens.reduce((s, it) => s + it.quantidade, 0),
      0,
    );
    const ticket = pedidos > 0 ? receita / pedidos : 0;
    return { receita, lucro, pedidos, produtos, ticket };
  }, [filtered]);

  // mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VendaStatus }) => {
      const { error } = await supabase.from("vendas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["controles"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const removeVenda = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venda excluída");
      setDetailId(null);
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["controles"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  return (
    <AppShell>
      <PageHeader
        title="Controle"
        description="Central operacional: cada venda registrada aqui alimenta produção, estoque, financeiro e dashboard."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditVenda(null);
              setOpenForm(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova Venda
          </Button>
        }
      />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Receita do período" value={fmtBRL(indicators.receita)} icon={DollarSign} tone="success" />
        <StatCard label="Lucro do período"   value={fmtBRL(indicators.lucro)}   icon={TrendingUp} tone="primary" delay={0.04} />
        <StatCard label="Pedidos"            value={indicators.pedidos}         icon={Receipt} delay={0.08} />
        <StatCard label="Produtos vendidos"  value={indicators.produtos}        icon={Package} tone="warning" delay={0.12} />
        <StatCard label="Ticket médio"       value={fmtBRL(indicators.ticket)}  icon={ShoppingBag} tone="primary" delay={0.16} />
      </div>

      {/* Filtros */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-elegant">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={fPeriod} onValueChange={(v) => setFPeriod(v as typeof fPeriod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Marketplace</Label>
            <Select value={fMarketplace} onValueChange={setFMarketplace}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MARKETPLACE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_LIST.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Nome do cliente" value={fCliente} onChange={(e) => setFCliente(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="SKU ou nome" value={fProduto} onChange={(e) => setFProduto(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <section className="mt-6 rounded-xl border border-border bg-card shadow-elegant">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda encontrada. Clique em <strong>Nova Venda</strong> para registrar a primeira.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const meta = statusMeta(v.status);
                const qtd = v.venda_itens.reduce((s, it) => s + it.quantidade, 0);
                return (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => setDetailId(v.id)}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(v.data_venda), "dd MMM yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.numero_pedido ?? "—"}</TableCell>
                    <TableCell className="text-sm">{marketplaceLabel(v.marketplace)}</TableCell>
                    <TableCell className="text-sm">{v.cliente_nome ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{qtd}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(Number(v.receita_bruta))}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={Number(v.lucro_liquido) >= 0 ? "text-[oklch(0.5_0.14_155)] dark:text-[oklch(0.78_0.14_155)]" : "text-destructive"}>
                        {fmtBRL(Number(v.lucro_liquido))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${meta.tone} border-0 font-medium`}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        venda={v}
                        onEdit={() => { setEditVenda(v); setOpenForm(true); }}
                        onDuplicate={() => { setEditVenda({ ...v, id: "", numero_pedido: null } as never); setOpenForm(true); }}
                        onCancel={() => setCancelTarget(v)}
                        onStatus={(status) => updateStatus.mutate({ id: v.id, status })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Form */}
      <VendaFormDialog
        open={openForm}
        onOpenChange={(v) => { setOpenForm(v); if (!v) setEditVenda(null); }}
        editing={editVenda}
      />

      {/* Painel de detalhes */}
      <VendaDetailSheet
        vendaId={detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
        onEdit={(v) => { setEditVenda(v); setDetailId(null); setOpenForm(true); }}
        onDelete={(id) => removeVenda.mutate(id)}
      />

      {/* Confirmar cancelamento */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao cancelar, o estoque e o faturamento voltam automaticamente ao estado anterior. Você pode reativar mudando o status depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) updateStatus.mutate({ id: cancelTarget.id, status: "cancelada" });
                setCancelTarget(null);
              }}
            >
              Cancelar venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// ============================================================================
// Ações por linha
// ============================================================================
function RowActions({
  venda, onEdit, onDuplicate, onCancel, onStatus,
}: {
  venda: Venda;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onStatus: (s: VendaStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicar venda</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onStatus("em_producao")}><Factory className="mr-2 h-4 w-4" /> Marcar em produção</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus("impressa")}><Printer className="mr-2 h-4 w-4" /> Marcar impressa</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus("embalada")}><PackageCheck className="mr-2 h-4 w-4" /> Marcar embalada</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus("enviada")}><Truck className="mr-2 h-4 w-4" /> Marcar enviada</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatus("entregue")}><CheckCircle2 className="mr-2 h-4 w-4" /> Marcar entregue</DropdownMenuItem>
        <DropdownMenuSeparator />
        {venda.status !== "cancelada" ? (
          <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
            <Ban className="mr-2 h-4 w-4" /> Cancelar venda
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onStatus("recebida")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Reativar venda
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Painel de detalhes
// ============================================================================
function VendaDetailSheet({
  vendaId, onOpenChange, onEdit, onDelete,
}: {
  vendaId: string | null;
  onOpenChange: (v: boolean) => void;
  onEdit: (v: Venda & { venda_itens: VendaItem[] }) => void;
  onDelete: (id: string) => void;
}) {
  const { data: vendas } = useSuspenseQuery(vendasQuery());
  const venda = vendas.find((v) => v.id === vendaId) ?? null;
  const open = !!vendaId && !!venda;
  if (!venda) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  const meta = statusMeta(venda.status);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhes da venda
            <Badge variant="secondary" className={`${meta.tone} border-0`}>{meta.label}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm">
          <section className="grid grid-cols-2 gap-3">
            <Field label="Data" value={format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
            <Field label="Marketplace" value={marketplaceLabel(venda.marketplace)} />
            <Field label="Pedido" value={venda.numero_pedido ?? "—"} />
            <Field label="Rastreio" value={venda.codigo_rastreio ?? "—"} />
            <Field label="Cliente" value={venda.cliente_nome ?? "—"} />
            <Field label="Telefone" value={venda.cliente_telefone ?? "—"} />
            <Field label="Cidade" value={venda.cliente_cidade ?? "—"} />
          </section>

          {venda.observacoes && (
            <section>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Observações</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{venda.observacoes}</p>
            </section>
          )}

          <Separator />

          <section>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Produtos</div>
            <div className="space-y-2">
              {venda.venda_itens.map((it) => (
                <div key={it.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{it.nome_snapshot}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{it.sku_snapshot}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div>{it.quantidade}× {fmtBRL(Number(it.valor_unitario))}</div>
                      <div className="text-xs text-muted-foreground">Subtotal: {fmtBRL(Number(it.subtotal))}</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                    <span>Peso: {Number(it.peso_g)}g</span>
                    <span>Tempo: {it.tempo_impressao_min} min</span>
                    <span>PLA: {fmtBRL(Number(it.custo_pla))}</span>
                    <span>Energia: {fmtBRL(Number(it.custo_energia))}</span>
                    <span>Desgaste: {fmtBRL(Number(it.custo_desgaste))}</span>
                    <span>Embalagem: {fmtBRL(Number(it.custo_embalagem))}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="grid grid-cols-2 gap-3">
            <Field label="Receita bruta" value={fmtBRL(Number(venda.receita_bruta))} />
            <Field label="Comissão" value={`${fmtBRL(Number(venda.comissao_valor))} (${Number(venda.comissao_percent)}%)`} />
            <Field label="Receita líquida" value={fmtBRL(Number(venda.receita_liquida))} />
            <Field label="Custo total" value={fmtBRL(Number(venda.custo_total))} />
            <Field label="Frete cliente" value={fmtBRL(Number(venda.frete_cliente))} />
            <Field label="Frete NOVRA" value={fmtBRL(Number(venda.frete_novra))} />
            <Field label="Lucro bruto" value={fmtBRL(Number(venda.lucro_bruto))} />
            <Field label="Lucro líquido" value={fmtBRL(Number(venda.lucro_liquido))} strong />
            <Field label="Margem" value={`${Number(venda.margem_percent).toFixed(1)}%`} />
            <Field label="Lucro / hora" value={fmtBRL(Number(venda.lucro_por_hora))} />
          </section>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={() => onEdit(venda)}><Edit className="mr-1.5 h-4 w-4" /> Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(venda.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 tabular-nums ${strong ? "text-base font-semibold" : "text-sm"}`}>{value}</div>
    </div>
  );
}

// ============================================================================
// Formulário Nova/Editar Venda
// ============================================================================
type ItemForm = {
  produto_id: string | null;
  sku_snapshot: string;
  nome_snapshot: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  peso_g: number;
  tempo_impressao_min: number;
  custo_pla: number;
  custo_energia: number;
  custo_desgaste: number;
  custo_embalagem: number;
};

const emptyItem = (): ItemForm => ({
  produto_id: null, sku_snapshot: "", nome_snapshot: "",
  quantidade: 1, valor_unitario: 0, desconto: 0,
  peso_g: 0, tempo_impressao_min: 0,
  custo_pla: 0, custo_energia: 0, custo_desgaste: 0, custo_embalagem: 0,
});

function itemUnitCost(it: ItemForm) {
  return Number(it.custo_pla) + Number(it.custo_energia) + Number(it.custo_desgaste) + Number(it.custo_embalagem);
}
function itemSubtotal(it: ItemForm) {
  return Math.max(0, Number(it.quantidade) * Number(it.valor_unitario) - Number(it.desconto));
}

function VendaFormDialog({
  open, onOpenChange, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: (Venda & { venda_itens: VendaItem[] }) | null;
}) {
  const qc = useQueryClient();
  const { data: produtos } = useQuery(produtosQuery());
  const { data: marketplaces } = useQuery(marketplacesQuery());

  const [form, setForm] = useState(() => initForm(editing));
  const [items, setItems] = useState<ItemForm[]>(() => initItems(editing));

  // reset ao abrir
  useMemo(() => {
    if (open) {
      setForm(initForm(editing));
      setItems(initItems(editing));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // aplicar comissões do marketplace ao trocar (apenas se não editando)
  const applyMarketplaceFees = (mkt: string) => {
    const m = marketplaces?.find((x) => {
      const nome = x.nome.toLowerCase();
      if (mkt === "shopee") return nome.includes("shopee");
      if (mkt === "mercado_livre") return nome.includes("mercado");
      if (mkt === "tiktok") return nome.includes("tiktok");
      if (mkt === "amazon") return nome.includes("amazon");
      return false;
    });
    if (m) {
      setForm((f) => ({
        ...f,
        marketplace: mkt,
        comissao_percent: Number(m.comissao_percent),
        taxa_fixa: Number(m.taxa_fixa),
        taxa_variavel_percent: Number(m.taxa_variavel_percent),
      }));
    } else {
      setForm((f) => ({ ...f, marketplace: mkt }));
    }
  };

  // cálculos em tempo real
  const totals = useMemo(() => {
    const subtotal_produtos = items.reduce((s, it) => s + itemSubtotal(it), 0);
    const desconto_total = items.reduce((s, it) => s + Number(it.desconto), 0);
    const receita_bruta = subtotal_produtos + Number(form.frete_cliente);
    const custo_total =
      items.reduce((s, it) => s + itemUnitCost(it) * Number(it.quantidade), 0) + Number(form.frete_novra);
    const comissao_valor =
      receita_bruta * (Number(form.comissao_percent) / 100) +
      receita_bruta * (Number(form.taxa_variavel_percent) / 100) +
      Number(form.taxa_fixa);
    const receita_liquida = receita_bruta - comissao_valor;
    const lucro_bruto = receita_bruta - custo_total;
    const lucro_liquido = receita_liquida - custo_total;
    const margem_percent = receita_bruta > 0 ? (lucro_liquido / receita_bruta) * 100 : 0;
    const tempo_total_min = items.reduce((s, it) => s + Number(it.tempo_impressao_min) * Number(it.quantidade), 0);
    const lucro_por_hora = tempo_total_min > 0 ? (lucro_liquido / (tempo_total_min / 60)) : 0;
    return {
      subtotal_produtos, desconto_total, receita_bruta, custo_total,
      comissao_valor, receita_liquida, lucro_bruto, lucro_liquido,
      margem_percent, tempo_total_min, lucro_por_hora,
    };
  }, [items, form.frete_cliente, form.frete_novra, form.comissao_percent, form.taxa_fixa, form.taxa_variavel_percent]);

  const save = useMutation({
    mutationFn: async () => {
      const isEdit = !!editing?.id;
      const payload = {
        marketplace: form.marketplace,
        numero_pedido: form.numero_pedido || null,
        data_venda: new Date(form.data_venda).toISOString(),
        cliente_nome: form.cliente_nome || null,
        cliente_telefone: form.cliente_telefone || null,
        cliente_cidade: form.cliente_cidade || null,
        observacoes: form.observacoes || null,
        frete_cliente: Number(form.frete_cliente),
        frete_novra: Number(form.frete_novra),
        codigo_rastreio: form.codigo_rastreio || null,
        comissao_percent: Number(form.comissao_percent),
        taxa_fixa: Number(form.taxa_fixa),
        taxa_variavel_percent: Number(form.taxa_variavel_percent),
        status: form.status,
        subtotal_produtos: totals.subtotal_produtos,
        desconto_total: totals.desconto_total,
        receita_bruta: totals.receita_bruta,
        comissao_valor: totals.comissao_valor,
        receita_liquida: totals.receita_liquida,
        custo_total: totals.custo_total,
        lucro_bruto: totals.lucro_bruto,
        lucro_liquido: totals.lucro_liquido,
        margem_percent: totals.margem_percent,
        tempo_total_min: totals.tempo_total_min,
        lucro_por_hora: totals.lucro_por_hora,
      };

      let vendaId: string;
      if (isEdit && editing) {
        const { error } = await supabase.from("vendas").update(payload).eq("id", editing.id);
        if (error) throw error;
        vendaId = editing.id;
        // remover itens antigos (dispara reverse) e reinserir (dispara apply)
        const { error: delErr } = await supabase.from("venda_itens").delete().eq("venda_id", vendaId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase.from("vendas").insert(payload).select("id").single();
        if (error) throw error;
        vendaId = data.id;
      }

      const itemRows = items
        .filter((it) => it.produto_id)
        .map((it) => ({
          venda_id: vendaId,
          produto_id: it.produto_id,
          sku_snapshot: it.sku_snapshot,
          nome_snapshot: it.nome_snapshot,
          quantidade: Number(it.quantidade),
          valor_unitario: Number(it.valor_unitario),
          desconto: Number(it.desconto),
          subtotal: itemSubtotal(it),
          peso_g: Number(it.peso_g),
          tempo_impressao_min: Number(it.tempo_impressao_min),
          custo_pla: Number(it.custo_pla),
          custo_energia: Number(it.custo_energia),
          custo_desgaste: Number(it.custo_desgaste),
          custo_embalagem: Number(it.custo_embalagem),
          custo_unitario_total: itemUnitCost(it),
        }));

      if (itemRows.length > 0) {
        const { error } = await supabase.from("venda_itens").insert(itemRows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["controles"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    },
  });

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const updateItem = (idx: number, patch: Partial<ItemForm>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const pickProduto = (idx: number, produtoId: string) => {
    const p = produtos?.find((x) => x.id === produtoId);
    if (!p) return;
    updateItem(idx, {
      produto_id: p.id,
      sku_snapshot: p.sku,
      nome_snapshot: p.nome,
      peso_g: Number(p.peso_g ?? 0),
      tempo_impressao_min: Number(p.tempo_impressao_min ?? 0),
      custo_pla: Number(p.custo_pla ?? 0),
      custo_energia: Number(p.custo_energia ?? 0),
      custo_desgaste: Number(p.custo_desgaste ?? 0),
      custo_embalagem: Number(p.custo_embalagem ?? 0),
      valor_unitario:
        Number(p.preco_shopee ?? p.preco_mercadolivre ?? p.preco_novra_sugerido ?? 0) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Editar venda" : "Nova venda"}</DialogTitle>
        </DialogHeader>

        {/* Informações da venda */}
        <Section title="Informações da venda">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Marketplace</Label>
              <Select value={form.marketplace} onValueChange={applyMarketplaceFees}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETPLACE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data da venda</Label>
              <Input
                type="datetime-local"
                value={form.data_venda}
                onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Número do pedido</Label>
              <Input value={form.numero_pedido} onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })} placeholder="opcional" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} placeholder="opcional" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <Input value={form.cliente_cidade} onChange={(e) => setForm({ ...form, cliente_cidade: e.target.value })} placeholder="opcional" />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
        </Section>

        {/* Produtos */}
        <Section
          title="Produtos"
          action={
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar produto
            </Button>
          }
        >
          {items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum produto — adicione pelo menos um.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Produto</Label>
                      <Select value={it.produto_id ?? ""} onValueChange={(v) => pickProduto(idx, v)}>
                        <SelectTrigger><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
                        <SelectContent>
                          {produtos?.filter((p) => !p.arquivado).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span> · {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="mt-5 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-4">
                    <NumField label="Qtd" value={it.quantidade} onChange={(v) => updateItem(idx, { quantidade: v })} />
                    <NumField label="Valor unitário" value={it.valor_unitario} step={0.01} onChange={(v) => updateItem(idx, { valor_unitario: v })} />
                    <NumField label="Desconto" value={it.desconto} step={0.01} onChange={(v) => updateItem(idx, { desconto: v })} />
                    <div>
                      <Label className="text-xs text-muted-foreground">Subtotal</Label>
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium tabular-nums">
                        {fmtBRL(itemSubtotal(it))}
                      </div>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Custos snapshot (peso, tempo, PLA, energia…)</summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <NumField label="Peso (g)" value={it.peso_g} step={0.1} onChange={(v) => updateItem(idx, { peso_g: v })} />
                      <NumField label="Tempo (min)" value={it.tempo_impressao_min} onChange={(v) => updateItem(idx, { tempo_impressao_min: v })} />
                      <NumField label="PLA" value={it.custo_pla} step={0.01} onChange={(v) => updateItem(idx, { custo_pla: v })} />
                      <NumField label="Energia" value={it.custo_energia} step={0.01} onChange={(v) => updateItem(idx, { custo_energia: v })} />
                      <NumField label="Desgaste" value={it.custo_desgaste} step={0.01} onChange={(v) => updateItem(idx, { custo_desgaste: v })} />
                      <NumField label="Embalagem" value={it.custo_embalagem} step={0.01} onChange={(v) => updateItem(idx, { custo_embalagem: v })} />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Frete e Comissão */}
        <Section title="Frete e comissão">
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="Frete pago pelo cliente" value={form.frete_cliente} step={0.01}
              onChange={(v) => setForm({ ...form, frete_cliente: v })} />
            <NumField label="Frete pago pela NOVRA" value={form.frete_novra} step={0.01}
              onChange={(v) => setForm({ ...form, frete_novra: v })} />
            <div>
              <Label className="text-xs text-muted-foreground">Código de rastreio</Label>
              <Input value={form.codigo_rastreio} onChange={(e) => setForm({ ...form, codigo_rastreio: e.target.value })} placeholder="opcional" />
            </div>
            <NumField label="Comissão (%)" value={form.comissao_percent} step={0.01}
              onChange={(v) => setForm({ ...form, comissao_percent: v })} />
            <NumField label="Taxa fixa (R$)" value={form.taxa_fixa} step={0.01}
              onChange={(v) => setForm({ ...form, taxa_fixa: v })} />
            <NumField label="Taxa variável (%)" value={form.taxa_variavel_percent} step={0.01}
              onChange={(v) => setForm({ ...form, taxa_variavel_percent: v })} />
          </div>
        </Section>

        {/* Totais em tempo real */}
        <Section title="Cálculos automáticos">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Receita bruta" value={fmtBRL(totals.receita_bruta)} />
            <Field label="Comissão" value={fmtBRL(totals.comissao_valor)} />
            <Field label="Receita líquida" value={fmtBRL(totals.receita_liquida)} />
            <Field label="Custo total" value={fmtBRL(totals.custo_total)} />
            <Field label="Lucro bruto" value={fmtBRL(totals.lucro_bruto)} />
            <Field label="Lucro líquido" value={fmtBRL(totals.lucro_liquido)} strong />
            <Field label="Margem" value={`${totals.margem_percent.toFixed(1)}%`} />
            <Field label="Lucro / hora" value={fmtBRL(totals.lucro_por_hora)} />
          </div>
        </Section>

        {/* Status */}
        <Section title="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VendaStatus })}>
            <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_LIST.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || items.filter((i) => i.produto_id).length === 0}
          >
            {editing?.id ? "Salvar alterações" : "Registrar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Helpers
// ============================================================================
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function NumField({
  label, value, onChange, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function initForm(editing: Venda | null) {
  const now = editing ? new Date(editing.data_venda) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    marketplace: editing?.marketplace ?? "shopee",
    numero_pedido: editing?.numero_pedido ?? "",
    data_venda: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
    cliente_nome: editing?.cliente_nome ?? "",
    cliente_telefone: editing?.cliente_telefone ?? "",
    cliente_cidade: editing?.cliente_cidade ?? "",
    observacoes: editing?.observacoes ?? "",
    frete_cliente: Number(editing?.frete_cliente ?? 0),
    frete_novra: Number(editing?.frete_novra ?? 0),
    codigo_rastreio: editing?.codigo_rastreio ?? "",
    comissao_percent: Number(editing?.comissao_percent ?? 0),
    taxa_fixa: Number(editing?.taxa_fixa ?? 0),
    taxa_variavel_percent: Number(editing?.taxa_variavel_percent ?? 0),
    status: (editing?.status ?? "recebida") as VendaStatus,
  };
}

function initItems(editing: (Venda & { venda_itens: VendaItem[] }) | null): ItemForm[] {
  if (!editing || editing.venda_itens.length === 0) return [emptyItem()];
  return editing.venda_itens.map((it) => ({
    produto_id: it.produto_id,
    sku_snapshot: it.sku_snapshot,
    nome_snapshot: it.nome_snapshot,
    quantidade: it.quantidade,
    valor_unitario: Number(it.valor_unitario),
    desconto: Number(it.desconto),
    peso_g: Number(it.peso_g),
    tempo_impressao_min: it.tempo_impressao_min,
    custo_pla: Number(it.custo_pla),
    custo_energia: Number(it.custo_energia),
    custo_desgaste: Number(it.custo_desgaste),
    custo_embalagem: Number(it.custo_embalagem),
  }));
}
