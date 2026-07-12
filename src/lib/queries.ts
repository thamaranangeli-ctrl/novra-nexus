import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Produto = Database["public"]["Tables"]["produtos"]["Row"];
export type ProdutoInsert = Database["public"]["Tables"]["produtos"]["Insert"];
export type ProdutoUpdate = Database["public"]["Tables"]["produtos"]["Update"];
export type FichaComercial = Database["public"]["Tables"]["ficha_comercial"]["Row"];
export type FichaProducao = Database["public"]["Tables"]["ficha_producao"]["Row"];
export type ControleEstoque = Database["public"]["Tables"]["controle_estoque"]["Row"];
export type Movimentacao = Database["public"]["Tables"]["movimentacoes"]["Row"];
export type Tarefa = Database["public"]["Tables"]["roadmap_tarefas"]["Row"];
export type TarefaInsert = Database["public"]["Tables"]["roadmap_tarefas"]["Insert"];
export type TarefaUpdate = Database["public"]["Tables"]["roadmap_tarefas"]["Update"];
export type ChecklistItem = Database["public"]["Tables"]["roadmap_checklist"]["Row"];
export type Anexo = Database["public"]["Tables"]["roadmap_anexos"]["Row"];
export type Historico = Database["public"]["Tables"]["historico_alteracoes"]["Row"];

export const checklistQuery = (tarefaId: string | null) =>
  queryOptions({
    queryKey: ["checklist", tarefaId],
    queryFn: async () => {
      if (!tarefaId) return [];
      const { data, error } = await supabase
        .from("roadmap_checklist")
        .select("*")
        .eq("tarefa_id", tarefaId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tarefaId,
  });

export const anexosTarefaQuery = (tarefaId: string | null) =>
  queryOptions({
    queryKey: ["anexos-tarefa", tarefaId],
    queryFn: async () => {
      if (!tarefaId) return [];
      const { data, error } = await supabase
        .from("roadmap_anexos")
        .select("*")
        .eq("tarefa_id", tarefaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tarefaId,
  });

export const produtosQuery = () =>
  queryOptions({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const produtoQuery = (id: string) =>
  queryOptions({
    queryKey: ["produto", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, ficha_comercial(*), ficha_producao(*), controle_estoque(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const controlesQuery = () =>
  queryOptions({
    queryKey: ["controles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("controle_estoque").select("*, produtos(sku,nome)");
      if (error) throw error;
      return data;
    },
  });

export const movimentacoesQuery = () =>
  queryOptions({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, produtos(sku,nome)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

export const tarefasQuery = () =>
  queryOptions({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_tarefas")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const historicoQuery = () =>
  queryOptions({
    queryKey: ["historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_alteracoes")
        .select("*, produtos(sku,nome)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

export const fichasProducaoQuery = () =>
  queryOptions({
    queryKey: ["fichas-producao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ficha_producao")
        .select("*, produtos(id,sku,nome,foto_url,peso_g,tempo_impressao_min,necessita_suportes,status)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const fichasComercialQuery = () =>
  queryOptions({
    queryKey: ["fichas-comercial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ficha_comercial")
        .select("*, produtos(id,sku,nome,foto_url,categoria,peso_g,tempo_impressao_min,cor_principal,cor_secundaria,necessita_suportes,status)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const arquivosProdutoQuery = (produtoId: string | null) =>
  queryOptions({
    queryKey: ["arquivos", produtoId],
    queryFn: async () => {
      if (!produtoId) return [];
      const { data, error } = await supabase
        .from("produto_arquivos")
        .select("*")
        .eq("produto_id", produtoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!produtoId,
  });

export const dashboardStatsQuery = () =>
  queryOptions({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [produtos, controles, comercial, producao] = await Promise.all([
        supabase.from("produtos").select("id,status,prioridade,descricao"),
        supabase.from("controle_estoque").select("estoque_atual,faturamento,lucro_total"),
        supabase.from("ficha_comercial").select("produto_id,preco"),
        supabase.from("ficha_producao").select("produto_id,altura_camada_mm,temperatura_bico"),
      ]);
      if (produtos.error) throw produtos.error;
      const total = produtos.data.length;
      const em_dev = produtos.data.filter((p) => p.status === "em_desenvolvimento").length;
      const concluidos = produtos.data.filter((p) => p.status === "concluido").length;
      const alta = produtos.data.filter((p) => p.prioridade === "alta" || p.prioridade === "urgente").length;
      const sem_descricao = produtos.data.filter((p) => !p.descricao || p.descricao.trim() === "").length;
      const estoque = (controles.data ?? []).reduce((a, c) => a + (c.estoque_atual ?? 0), 0);
      const faturamento = (controles.data ?? []).reduce((a, c) => a + Number(c.faturamento ?? 0), 0);
      const lucro = (controles.data ?? []).reduce((a, c) => a + Number(c.lucro_total ?? 0), 0);
      const semPreco = (comercial.data ?? []).filter((c) => !c.preco || Number(c.preco) === 0).length;
      const semFichaProducao = produtos.data.filter(
        (p) => !(producao.data ?? []).some((f) => f.produto_id === p.id && f.altura_camada_mm),
      ).length;
      const semFichaComercial = produtos.data.filter(
        (p) => !(comercial.data ?? []).some((f) => f.produto_id === p.id && f.preco),
      ).length;
      return {
        total,
        em_desenvolvimento: em_dev,
        concluidos,
        prioridade_alta: alta,
        estoque,
        sem_preco: semPreco,
        sem_descricao,
        sem_ficha_producao: semFichaProducao,
        sem_ficha_comercial: semFichaComercial,
        faturamento,
        lucro,
      };
    },
  });
