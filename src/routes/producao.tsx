import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Factory, Search, Save, FileUp, Trash2, Link as LinkIcon, Package,
  Thermometer, Layers, Gauge, Timer, Weight, Sparkles, Calculator,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fichasProducaoQuery, arquivosProdutoQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type FichaRow = Database["public"]["Tables"]["ficha_producao"]["Row"] & {
  produtos: {
    id: string; sku: string; nome: string; foto_url: string | null;
    peso_g: number | null; tempo_impressao_min: number | null;
    necessita_suportes: boolean | null; status: string;
  } | null;
};
type FichaUpdate = Database["public"]["Tables"]["ficha_producao"]["Update"];

export const Route = createFileRoute("/producao")({
  head: () => ({ meta: [{ title: "Produção — NOVRA" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(fichasProducaoQuery());
  },
  component: ProducaoPage,
});

// Custos padrão (editáveis pela UI de cálculo)
const DEFAULTS = {
  precoPlaPorGrama: 0.12, // R$/g
  custoEnergiaHora: 0.5,  // R$/h
  desgasteHora: 0.3,      // R$/h (bico, mesa, correias)
};

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function ProducaoPage() {
  const { data: fichas } = useSuspenseQuery(fichasProducaoQuery());
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (fichas as FichaRow[]).filter((f) => {
      const p = f.produtos;
      if (!p) return false;
      if (q === "") return true;
      const s = q.toLowerCase();
      return p.sku.toLowerCase().includes(s) || p.nome.toLowerCase().includes(s);
    });
  }, [fichas, q]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = (fichas as FichaRow[]).find((f) => f.id === selectedId) ?? null;

  if (fichas.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Produção" description="Fichas técnicas de impressão por SKU." />
        <EmptyState
          icon={Factory}
          title="Nenhum produto cadastrado"
          description="Cadastre produtos no módulo Produtos para configurar suas fichas técnicas de impressão."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Produção"
        description="Fichas técnicas estilo OrcaSlicer com cálculo automático de custo por peça."
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Lista */}
        <aside className="rounded-xl border border-border bg-card shadow-elegant">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar SKU ou nome" className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-2">
            <AnimatePresence initial={false}>
              {filtered.map((f) => {
                const p = f.produtos!;
                const ok = !!f.altura_camada_mm && !!f.pla_consumido_g;
                return (
                  <motion.button
                    key={f.id} layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2 text-left transition",
                      selectedId === f.id
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.nome}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.sku}</div>
                    </div>
                    <span className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      ok ? "bg-[oklch(0.65_0.14_155)]" : "bg-muted-foreground/40",
                    )} title={ok ? "Ficha completa" : "Ficha incompleta"} />
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">Nenhum resultado.</p>
            )}
          </div>
        </aside>

        {/* Editor */}
        {selected ? (
          <FichaEditor key={selected.id} ficha={selected} />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
            Selecione um produto para editar sua ficha.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FichaEditor({ ficha }: { ficha: FichaRow }) {
  const qc = useQueryClient();
  const p = ficha.produtos!;
  const [form, setForm] = useState<FichaUpdate>({
    altura_camada_mm: ficha.altura_camada_mm,
    bico_mm: ficha.bico_mm,
    infill_percent: ficha.infill_percent,
    velocidade_mms: ficha.velocidade_mms,
    temperatura_bico: ficha.temperatura_bico,
    temperatura_mesa: ficha.temperatura_mesa,
    pla_consumido_g: ficha.pla_consumido_g,
    consumo_estimado_g: ficha.consumo_estimado_g,
    peso_final_g: ficha.peso_final_g,
    tempo_real_min: ficha.tempo_real_min,
    quantidade_suportes: ficha.quantidade_suportes,
    observacoes: ficha.observacoes,
    custo_producao: ficha.custo_producao,
  });
  const [showCalc, setShowCalc] = useState(false);

  const set = <K extends keyof FichaUpdate>(k: K, v: FichaUpdate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === "" ? null : Number(v));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ficha_producao").update(form).eq("id", ficha.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas-producao"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Ficha de produção salva");
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  return (
    <div className="space-y-5">
      {/* Header do produto */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {p.foto_url ? (
              <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="text-base font-semibold">{p.nome}</div>
            <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalc(true)} className="gap-2">
            <Calculator className="h-4 w-4" /> Calcular custo
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {save.isPending ? "Salvando..." : "Salvar ficha"}
          </Button>
        </div>
      </div>

      {/* Parâmetros de impressão */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
        <SectionTitle icon={Layers} title="Parâmetros de fatiamento" hint="Configurações do slicer (OrcaSlicer / Bambu Studio / Cura)" />
        <div className="grid gap-4 md:grid-cols-3">
          <NumField icon={Layers} label="Altura da camada (mm)" step="0.01" value={form.altura_camada_mm} onChange={(v) => set("altura_camada_mm", num(v))} placeholder="0.20" />
          <NumField icon={Gauge} label="Diâmetro do bico (mm)" step="0.1" value={form.bico_mm} onChange={(v) => set("bico_mm", num(v))} placeholder="0.4" />
          <NumField label="Preenchimento (%)" value={form.infill_percent} onChange={(v) => set("infill_percent", num(v))} placeholder="20" />
          <NumField label="Velocidade (mm/s)" value={form.velocidade_mms} onChange={(v) => set("velocidade_mms", num(v))} placeholder="150" />
          <NumField icon={Thermometer} label="Temp. bico (°C)" value={form.temperatura_bico} onChange={(v) => set("temperatura_bico", num(v))} placeholder="215" />
          <NumField icon={Thermometer} label="Temp. mesa (°C)" value={form.temperatura_mesa} onChange={(v) => set("temperatura_mesa", num(v))} placeholder="60" />
        </div>
      </section>

      {/* Consumo e tempo */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
        <SectionTitle icon={Weight} title="Consumo & tempo real" hint="Dados medidos na impressão" />
        <div className="grid gap-4 md:grid-cols-4">
          <NumField label="Estimado (g)" step="0.1" value={form.consumo_estimado_g} onChange={(v) => set("consumo_estimado_g", num(v))} placeholder="45.0" />
          <NumField label="PLA consumido (g)" step="0.1" value={form.pla_consumido_g} onChange={(v) => set("pla_consumido_g", num(v))} placeholder="48.5" />
          <NumField label="Peso final (g)" step="0.1" value={form.peso_final_g} onChange={(v) => set("peso_final_g", num(v))} placeholder="46.2" />
          <NumField icon={Timer} label="Tempo real (min)" value={form.tempo_real_min} onChange={(v) => set("tempo_real_min", num(v))} placeholder="180" />
          <NumField label="Qtd. suportes" value={form.quantidade_suportes} onChange={(v) => set("quantidade_suportes", num(v))} placeholder="0" />
          <div className="md:col-span-3 flex items-end">
            <div className="flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Custo de produção</div>
                <div className="text-lg font-semibold text-primary tabular-nums">
                  {form.custo_producao ? fmtBRL(Number(form.custo_producao)) : "—"}
                </div>
              </div>
              <Sparkles className="h-5 w-5 text-primary/60" />
            </div>
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
        <SectionTitle icon={Factory} title="Observações de impressão" />
        <Textarea
          rows={3}
          value={form.observacoes ?? ""}
          onChange={(e) => set("observacoes", e.target.value)}
          placeholder="Ex: usar cola no vidro, retração 0.8mm, warping nas bordas..."
        />
      </section>

      {/* Arquivos */}
      <ArquivosSection produtoId={p.id} />

      <CustoDialog
        open={showCalc}
        onClose={() => setShowCalc(false)}
        gramas={Number(form.pla_consumido_g ?? form.consumo_estimado_g ?? p.peso_g ?? 0)}
        tempoMin={Number(form.tempo_real_min ?? p.tempo_impressao_min ?? 0)}
        onApply={(custo) => { set("custo_producao", custo); setShowCalc(false); toast.success("Custo aplicado à ficha"); }}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint }: { icon: typeof Factory; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold leading-none">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function NumField({
  label, value, onChange, icon: Icon, step, placeholder,
}: {
  label: string; value: number | null | undefined;
  onChange: (v: string) => void;
  icon?: typeof Factory; step?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />}
        <Input
          type="number" step={step ?? "1"} placeholder={placeholder}
          value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className={cn("tabular-nums", Icon && "pl-8")}
        />
      </div>
    </div>
  );
}

function ArquivosSection({ produtoId }: { produtoId: string }) {
  const qc = useQueryClient();
  const { data: arquivos = [] } = useQuery(arquivosProdutoQuery(produtoId));
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [tipo, setTipo] = useState("stl");

  const add = useMutation({
    mutationFn: async () => {
      if (!nome || !url) throw new Error("Nome e URL são obrigatórios");
      const { error } = await supabase.from("produto_arquivos").insert({
        produto_id: produtoId, nome, url, tipo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arquivos", produtoId] });
      setNome(""); setUrl("");
      toast.success("Arquivo adicionado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produto_arquivos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arquivos", produtoId] });
      toast.success("Arquivo removido");
    },
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-elegant">
      <SectionTitle icon={FileUp} title="Arquivos do produto" hint="Referências para STL, 3MF, GCODE, imagens e renders" />

      <div className="mb-4 grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 md:grid-cols-[1fr_2fr_120px_auto]">
        <Input placeholder="Nome (ex: modelo v2)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input placeholder="URL do arquivo (Drive, Dropbox, GitHub...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select
          value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="stl">STL</option>
          <option value="3mf">3MF</option>
          <option value="gcode">GCODE</option>
          <option value="step">STEP</option>
          <option value="imagem">Imagem</option>
          <option value="outro">Outro</option>
        </select>
        <Button onClick={() => add.mutate()} disabled={add.isPending} className="gap-1.5">
          <FileUp className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {arquivos.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum arquivo referenciado ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {arquivos.map((a) => (
              <motion.li
                key={a.id} layout
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-2.5"
              >
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                  {a.tipo ?? "arq"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.url}</div>
                </div>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                  <LinkIcon className="h-4 w-4" />
                </a>
                <button
                  onClick={() => remove.mutate(a.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function CustoDialog({
  open, onClose, gramas, tempoMin, onApply,
}: {
  open: boolean; onClose: () => void;
  gramas: number; tempoMin: number;
  onApply: (custo: number) => void;
}) {
  const [precoPla, setPrecoPla] = useState(DEFAULTS.precoPlaPorGrama);
  const [energia, setEnergia] = useState(DEFAULTS.custoEnergiaHora);
  const [desgaste, setDesgaste] = useState(DEFAULTS.desgasteHora);
  const [extras, setExtras] = useState(0);

  const horas = tempoMin / 60;
  const custoPla = gramas * precoPla;
  const custoEnergia = horas * energia;
  const custoDesgaste = horas * desgaste;
  const total = custoPla + custoEnergia + custoDesgaste + extras;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Calcular custo de produção
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
            <div><span className="text-muted-foreground">Filamento:</span> <span className="font-medium tabular-nums">{gramas.toFixed(1)} g</span></div>
            <div><span className="text-muted-foreground">Tempo:</span> <span className="font-medium tabular-nums">{horas.toFixed(2)} h</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="R$/g PLA">
              <Input type="number" step="0.01" value={precoPla} onChange={(e) => setPrecoPla(Number(e.target.value))} />
            </Field>
            <Field label="R$/h energia">
              <Input type="number" step="0.01" value={energia} onChange={(e) => setEnergia(Number(e.target.value))} />
            </Field>
            <Field label="R$/h desgaste">
              <Input type="number" step="0.01" value={desgaste} onChange={(e) => setDesgaste(Number(e.target.value))} />
            </Field>
            <Field label="Extras (R$)">
              <Input type="number" step="0.01" value={extras} onChange={(e) => setExtras(Number(e.target.value))} />
            </Field>
          </div>
          <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
            <Row label="Filamento" value={custoPla} />
            <Row label="Energia" value={custoEnergia} />
            <Row label="Desgaste" value={custoDesgaste} />
            <Row label="Extras" value={extras} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-primary tabular-nums">{fmtBRL(total)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onApply(Number(total.toFixed(2)))} className="gap-1.5">
            <Save className="h-4 w-4" /> Aplicar custo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{fmtBRL(value)}</span>
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
