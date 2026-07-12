import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, KanbanSquare, Calendar, User, GripVertical, Trash2, Pencil,
  CheckSquare, Paperclip, ExternalLink, X, Package,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  tarefasQuery, produtosQuery, checklistQuery, anexosTarefaQuery,
  type Tarefa, type TarefaInsert,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type Coluna = "backlog" | "em_andamento" | "concluido";
type Prioridade = "baixa" | "media" | "alta" | "urgente";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — NOVRA" },
      { name: "description", content: "Kanban de tarefas com checklists e anexos por card." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(tarefasQuery());
    context.queryClient.ensureQueryData(produtosQuery());
  },
  component: RoadmapPage,
});

const colunas: { id: Coluna; label: string; accent: string }[] = [
  { id: "backlog", label: "Backlog", accent: "bg-muted-foreground/40" },
  { id: "em_andamento", label: "Em andamento", accent: "bg-primary" },
  { id: "concluido", label: "Concluído", accent: "bg-emerald-500" },
];

const prioridadeMeta: Record<Prioridade, { label: string; className: string; dot: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
  media: { label: "Média", className: "bg-primary/10 text-primary", dot: "bg-primary" },
  alta: { label: "Alta", className: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.55_0.15_75)]", dot: "bg-[oklch(0.65_0.18_60)]" },
  urgente: { label: "Urgente", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

function RoadmapPage() {
  const { data: tarefas } = useSuspenseQuery(tarefasQuery());
  const { data: produtos } = useSuspenseQuery(produtosQuery());
  const qc = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grupos = useMemo(() => {
    const map: Record<Coluna, Tarefa[]> = { backlog: [], em_andamento: [], concluido: [] };
    for (const t of tarefas) map[t.coluna as Coluna]?.push(t);
    for (const k of Object.keys(map) as Coluna[]) {
      map[k].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    }
    return map;
  }, [tarefas]);

  const move = useMutation({
    mutationFn: async ({ id, coluna, ordem }: { id: string; coluna: Coluna; ordem: number }) => {
      const { error } = await supabase
        .from("roadmap_tarefas")
        .update({ coluna, ordem })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["tarefas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function findTarefa(id: string) {
    return tarefas.find((t) => t.id === id) ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeTarefa = findTarefa(String(active.id));
    if (!activeTarefa) return;

    const overId = String(over.id);
    // over pode ser uma coluna vazia (id = "col:<coluna>") ou outra tarefa
    let destColuna: Coluna;
    let destIndex: number;

    if (overId.startsWith("col:")) {
      destColuna = overId.slice(4) as Coluna;
      destIndex = grupos[destColuna].length;
    } else {
      const overTarefa = findTarefa(overId);
      if (!overTarefa) return;
      destColuna = overTarefa.coluna as Coluna;
      destIndex = grupos[destColuna].findIndex((t) => t.id === overTarefa.id);
    }

    if (activeTarefa.coluna === destColuna && activeTarefa.ordem === destIndex) return;

    // Otimista: atualiza cache local
    const novaLista = tarefas.map((t) => (t.id === activeTarefa.id ? { ...t, coluna: destColuna } : t));
    qc.setQueryData(["tarefas"], novaLista);

    move.mutate({ id: activeTarefa.id, coluna: destColuna, ordem: destIndex });
  }

  const activeTarefa = activeId ? findTarefa(activeId) : null;

  return (
    <AppShell>
      <PageHeader
        title="Roadmap"
        description="Organize o desenvolvimento em Kanban — arraste os cards, adicione checklists e anexos."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setOpenDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Nova tarefa
        </Button>
      </PageHeader>

      {tarefas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <KanbanSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <div className="text-lg font-semibold mb-1">Nenhuma tarefa ainda</div>
          <div className="text-sm text-muted-foreground mb-4">
            Crie a primeira tarefa e comece a organizar o roadmap.
          </div>
          <Button onClick={() => { setEditing(null); setOpenDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Criar tarefa
          </Button>
        </div>
      )}

      {tarefas.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {colunas.map((c) => (
              <KanbanColumn
                key={c.id}
                coluna={c}
                tarefas={grupos[c.id]}
                onOpen={(t) => setDetailId(t.id)}
                onEdit={(t) => { setEditing(t); setOpenDialog(true); }}
                onDelete={(t) => setDeleteId(t.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTarefa && (
              <div className="rotate-2 opacity-95">
                <TarefaCard tarefa={activeTarefa} dragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <TarefaDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        editing={editing}
        produtos={produtos}
      />

      <TarefaDetalhe
        tarefaId={detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação também removerá checklists e anexos vinculados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && del.mutate(deleteId)}
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

function KanbanColumn({
  coluna, tarefas, onOpen, onEdit, onDelete,
}: {
  coluna: { id: Coluna; label: string; accent: string };
  tarefas: Tarefa[];
  onOpen: (t: Tarefa) => void;
  onEdit: (t: Tarefa) => void;
  onDelete: (t: Tarefa) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: `col:${coluna.id}` });
  return (
    <div className="rounded-2xl border border-border bg-card/50 flex flex-col min-h-[400px]">
      <div className="p-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", coluna.accent)} />
          <div className="font-semibold text-sm">{coluna.label}</div>
          <div className="text-xs text-muted-foreground">· {tarefas.length}</div>
        </div>
      </div>
      <SortableContext items={tarefas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 space-y-2 transition-colors rounded-b-2xl",
            isOver && "bg-primary/5",
          )}
        >
          {tarefas.map((t) => (
            <SortableCard
              key={t.id}
              tarefa={t}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {tarefas.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/60 rounded-lg">
              Arraste aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  tarefa, onOpen, onEdit, onDelete,
}: {
  tarefa: Tarefa;
  onOpen: (t: Tarefa) => void;
  onEdit: (t: Tarefa) => void;
  onDelete: (t: Tarefa) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-40")}
    >
      <TarefaCard
        tarefa={tarefa}
        dragHandleProps={{ ...attributes, ...listeners }}
        onOpen={() => onOpen(tarefa)}
        onEdit={() => onEdit(tarefa)}
        onDelete={() => onDelete(tarefa)}
      />
    </div>
  );
}

function TarefaCard({
  tarefa, dragHandleProps, onOpen, onEdit, onDelete, dragging,
}: {
  tarefa: Tarefa;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dragging?: boolean;
}) {
  const p = prioridadeMeta[tarefa.prioridade as Prioridade] ?? prioridadeMeta.media;
  return (
    <motion.div
      layout={!dragging}
      className="group rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{tarefa.titulo}</div>
          {tarefa.descricao && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {tarefa.descricao}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", p.className)}>
              {p.label}
            </span>
            {tarefa.responsavel && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {tarefa.responsavel}
              </span>
            )}
            {tarefa.data_prevista && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(tarefa.data_prevista).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        {!dragging && (
          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1 rounded hover:bg-muted"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-1 rounded hover:bg-destructive/10"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TarefaDialog({
  open, onOpenChange, editing, produtos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Tarefa | null;
  produtos: { id: string; nome: string; sku: string }[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TarefaInsert>(() => defaults(editing));

  // reset when open/editing changes
  useMemo(() => setForm(defaults(editing)), [editing, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, titulo: (form.titulo ?? "").trim() };
      if (!payload.titulo) throw new Error("Título é obrigatório");
      if (editing) {
        const { error } = await supabase.from("roadmap_tarefas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("roadmap_tarefas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tarefa atualizada" : "Tarefa criada");
      qc.invalidateQueries({ queryKey: ["tarefas"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.titulo ?? ""}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Modelar novo suporte de celular"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.descricao ?? ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Detalhes, contexto, critérios..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Coluna</Label>
              <Select
                value={(form.coluna as Coluna) ?? "backlog"}
                onValueChange={(v) => setForm({ ...form, coluna: v as Coluna })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select
                value={(form.prioridade as Prioridade) ?? "media"}
                onValueChange={(v) => setForm({ ...form, prioridade: v as Prioridade })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input
                value={form.responsavel ?? ""}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                placeholder="Nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data prevista</Label>
              <Input
                type="date"
                value={form.data_prevista ?? ""}
                onChange={(e) => setForm({ ...form, data_prevista: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Produto vinculado (opcional)</Label>
            <Select
              value={form.produto_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, produto_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.sku} — {p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaults(t: Tarefa | null): TarefaInsert {
  return {
    titulo: t?.titulo ?? "",
    descricao: t?.descricao ?? "",
    coluna: (t?.coluna as Coluna) ?? "backlog",
    prioridade: (t?.prioridade as Prioridade) ?? "media",
    responsavel: t?.responsavel ?? "",
    data_prevista: t?.data_prevista ?? null,
    produto_id: t?.produto_id ?? null,
    ordem: t?.ordem ?? 0,
  };
}

function TarefaDetalhe({
  tarefaId, onOpenChange,
}: {
  tarefaId: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: tarefas } = useSuspenseQuery(tarefasQuery());
  const { data: produtos } = useSuspenseQuery(produtosQuery());
  const tarefa = tarefas.find((t) => t.id === tarefaId) ?? null;

  const { data: checklist = [] } = useQuery(checklistQuery(tarefaId));
  const { data: anexos = [] } = useQuery(anexosTarefaQuery(tarefaId));

  const [novoItem, setNovoItem] = useState("");
  const [novoAnexoNome, setNovoAnexoNome] = useState("");
  const [novoAnexoUrl, setNovoAnexoUrl] = useState("");

  const addItem = useMutation({
    mutationFn: async () => {
      if (!tarefaId || !novoItem.trim()) return;
      const { error } = await supabase.from("roadmap_checklist").insert({
        tarefa_id: tarefaId,
        texto: novoItem.trim(),
        ordem: checklist.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoItem("");
      qc.invalidateQueries({ queryKey: ["checklist", tarefaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("roadmap_checklist")
        .update({ concluido })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", tarefaId] }),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_checklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", tarefaId] }),
  });

  const addAnexo = useMutation({
    mutationFn: async () => {
      if (!tarefaId || !novoAnexoNome.trim() || !novoAnexoUrl.trim()) return;
      const { error } = await supabase.from("roadmap_anexos").insert({
        tarefa_id: tarefaId,
        nome: novoAnexoNome.trim(),
        url: novoAnexoUrl.trim(),
        tipo: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoAnexoNome("");
      setNovoAnexoUrl("");
      qc.invalidateQueries({ queryKey: ["anexos-tarefa", tarefaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delAnexo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_anexos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anexos-tarefa", tarefaId] }),
  });

  const produto = tarefa?.produto_id ? produtos.find((p) => p.id === tarefa.produto_id) : null;
  const feitos = checklist.filter((c) => c.concluido).length;
  const total = checklist.length;
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;

  return (
    <Dialog open={!!tarefaId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {tarefa && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{tarefa.titulo}</DialogTitle>
            </DialogHeader>

            {tarefa.descricao && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tarefa.descricao}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={cn("px-2 py-0.5 rounded-md font-medium", prioridadeMeta[tarefa.prioridade as Prioridade]?.className)}>
                {prioridadeMeta[tarefa.prioridade as Prioridade]?.label}
              </span>
              {tarefa.responsavel && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> {tarefa.responsavel}
                </span>
              )}
              {tarefa.data_prevista && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(tarefa.data_prevista).toLocaleDateString("pt-BR")}
                </span>
              )}
              {produto && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" /> {produto.sku} — {produto.nome}
                </span>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Checklist</h3>
                </div>
                {total > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {feitos}/{total} · {pct}%
                  </div>
                )}
              </div>
              {total > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 group p-1.5 rounded-md hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={item.concluido ?? false}
                      onCheckedChange={(v) =>
                        toggleItem.mutate({ id: item.id, concluido: !!v })
                      }
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        item.concluido && "line-through text-muted-foreground",
                      )}
                    >
                      {item.texto}
                    </span>
                    <button
                      onClick={() => delItem.mutate(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10"
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={novoItem}
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem.mutate()}
                  placeholder="Adicionar item..."
                  className="h-9"
                />
                <Button
                  onClick={() => addItem.mutate()}
                  disabled={!novoItem.trim()}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Anexos */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Anexos</h3>
              </div>
              <div className="space-y-1">
                {anexos.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 group p-2 rounded-md border border-border bg-muted/30"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-sm truncate">{a.nome}</div>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-muted"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => delAnexo.mutate(a.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10"
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2">
                <Input
                  value={novoAnexoNome}
                  onChange={(e) => setNovoAnexoNome(e.target.value)}
                  placeholder="Nome"
                  className="h-9"
                />
                <Input
                  value={novoAnexoUrl}
                  onChange={(e) => setNovoAnexoUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-9"
                />
                <Button
                  onClick={() => addAnexo.mutate()}
                  disabled={!novoAnexoNome.trim() || !novoAnexoUrl.trim()}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
