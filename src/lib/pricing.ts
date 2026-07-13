import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Filamento = Database["public"]["Tables"]["filamentos"]["Row"];
export type Impressora = Database["public"]["Tables"]["impressoras"]["Row"];
export type Embalagem = Database["public"]["Tables"]["embalagens"]["Row"];
export type CustoFixo = Database["public"]["Tables"]["custos_fixos"]["Row"];
export type Marketplace = Database["public"]["Tables"]["marketplaces"]["Row"];
export type EnergiaConfig = Database["public"]["Tables"]["energia_config"]["Row"];
export type ProdutoCusto = Database["public"]["Tables"]["produto_custos"]["Row"];

export const filamentosQuery = () =>
  queryOptions({
    queryKey: ["filamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filamentos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const impressorasQuery = () =>
  queryOptions({
    queryKey: ["impressoras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("impressoras").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const embalagensQuery = () =>
  queryOptions({
    queryKey: ["embalagens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("embalagens").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const custosFixosQuery = () =>
  queryOptions({
    queryKey: ["custos_fixos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custos_fixos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const marketplacesQuery = () =>
  queryOptions({
    queryKey: ["marketplaces"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplaces").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const energiaConfigQuery = () =>
  queryOptions({
    queryKey: ["energia_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("energia_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const produtoCustosQuery = () =>
  queryOptions({
    queryKey: ["produto_custos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produto_custos")
        .select("*, produtos(id,sku,nome,foto_url)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

// ============================================================================
// Cálculo de precificação
// ============================================================================

export type CalculoInput = {
  peso_peca_g: number;
  tempo_impressao_min: number;
  tempo_acabamento_min: number;
  desperdicio_percent: number;
  frete_estimado: number;
  custos_extras: number;
  lucro_desejado_percent: number;
  filamento: Filamento | null;
  impressora: Impressora | null;
  embalagem: Embalagem | null;
  energia: EnergiaConfig | null;
};

export type CustoBreakdown = {
  custo_filamento: number;
  custo_desperdicio: number;
  custo_energia: number;
  custo_depreciacao: number;
  custo_embalagem: number;
  frete: number;
  extras: number;
  custo_total: number; // sem taxas de marketplace
};

export function calcularCusto(input: CalculoInput): CustoBreakdown {
  const {
    peso_peca_g,
    tempo_impressao_min,
    desperdicio_percent,
    frete_estimado,
    custos_extras,
    filamento,
    impressora,
    embalagem,
    energia,
  } = input;

  const custoGrama =
    filamento && filamento.peso_rolo_g > 0
      ? (Number(filamento.valor_pago) + Number(filamento.valor_frete)) / Number(filamento.peso_rolo_g)
      : 0;

  const custo_filamento = custoGrama * peso_peca_g;
  const custo_desperdicio = custo_filamento * (desperdicio_percent / 100);

  const horas = tempo_impressao_min / 60;
  const kwh = energia ? Number(energia.valor_kwh) : 0;
  const potenciaKw = impressora ? Number(impressora.potencia_watts) / 1000 : 0;
  const custo_energia = horas * potenciaKw * kwh;

  const depHora =
    impressora && Number(impressora.vida_util_horas) > 0
      ? Number(impressora.valor_compra) / Number(impressora.vida_util_horas)
      : 0;
  const custo_depreciacao = horas * depHora;

  const custo_embalagem = embalagem ? Number(embalagem.valor_unitario) : 0;

  const custo_total =
    custo_filamento +
    custo_desperdicio +
    custo_energia +
    custo_depreciacao +
    custo_embalagem +
    frete_estimado +
    custos_extras;

  return {
    custo_filamento,
    custo_desperdicio,
    custo_energia,
    custo_depreciacao,
    custo_embalagem,
    frete: frete_estimado,
    extras: custos_extras,
    custo_total,
  };
}

export type PrecoMarketplace = {
  marketplace: Marketplace;
  preco_sugerido: number;
  taxas: number;
  lucro_liquido: number;
  margem_percent: number;
};

/**
 * Calcula preço sugerido resolvendo:
 *   preco = custo_total + taxa_fixa + preco * (comissao + taxa_variavel)/100 + preco * lucro/100
 * → preco * (1 - (comissao+taxa_var+lucro)/100) = custo_total + taxa_fixa
 */
export function calcularPrecoMarketplace(
  custo_total: number,
  lucro_desejado_percent: number,
  m: Marketplace,
): PrecoMarketplace {
  const fatorSaida =
    1 -
    (Number(m.comissao_percent) + Number(m.taxa_variavel_percent) + lucro_desejado_percent) / 100;
  const preco_sugerido =
    fatorSaida > 0 ? (custo_total + Number(m.taxa_fixa)) / fatorSaida : custo_total + Number(m.taxa_fixa);
  const taxas =
    preco_sugerido * ((Number(m.comissao_percent) + Number(m.taxa_variavel_percent)) / 100) +
    Number(m.taxa_fixa);
  const lucro_liquido = preco_sugerido - taxas - custo_total;
  const margem_percent = preco_sugerido > 0 ? (lucro_liquido / preco_sugerido) * 100 : 0;
  return { marketplace: m, preco_sugerido, taxas, lucro_liquido, margem_percent };
}

/** Preço mínimo (zero lucro) para determinado marketplace. */
export function precoMinimo(custo_total: number, m: Marketplace): number {
  return calcularPrecoMarketplace(custo_total, 0, m).preco_sugerido;
}

export function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );
}
