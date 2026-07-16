
-- Add new status values to enum
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'ideia';
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'pesquisando';
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'testando';
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'publicado';

-- Expand produtos with market intelligence, STL, production, research and NOVRA score fields
ALTER TABLE public.produtos
  -- STL
  ADD COLUMN IF NOT EXISTS stl_fonte text,
  ADD COLUMN IF NOT EXISTS stl_link text,
  ADD COLUMN IF NOT EXISTS stl_autor text,
  ADD COLUMN IF NOT EXISTS stl_licenca_comercial boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stl_tipo_licenca text,
  ADD COLUMN IF NOT EXISTS stl_observacoes text,
  ADD COLUMN IF NOT EXISTS fornecedor_licenca text,
  -- Mercado
  ADD COLUMN IF NOT EXISTS preco_shopee numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_mercadolivre numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_tiktok numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_amazon numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_novra_sugerido numeric(12,2),
  ADD COLUMN IF NOT EXISTS link_shopee text,
  ADD COLUMN IF NOT EXISTS link_mercadolivre text,
  ADD COLUMN IF NOT EXISTS link_tiktok text,
  ADD COLUMN IF NOT EXISTS link_amazon text,
  -- Produção adicional
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS quantidade_pla_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS custo_pla numeric(12,2),
  ADD COLUMN IF NOT EXISTS custo_energia numeric(12,2),
  ADD COLUMN IF NOT EXISTS custo_desgaste numeric(12,2),
  ADD COLUMN IF NOT EXISTS custo_embalagem numeric(12,2),
  ADD COLUMN IF NOT EXISTS frete_subsidiado numeric(12,2),
  ADD COLUMN IF NOT EXISTS lucro_liquido numeric(12,2),
  ADD COLUMN IF NOT EXISTS lucro_por_hora numeric(12,2),
  -- Pesquisa
  ADD COLUMN IF NOT EXISTS saturacao text,
  ADD COLUMN IF NOT EXISTS potencial_giro text,
  ADD COLUMN IF NOT EXISTS recorrencia text,
  ADD COLUMN IF NOT EXISTS concorrencia_importados text,
  ADD COLUMN IF NOT EXISTS possui_diferencial boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diferencial_tipos text[],
  ADD COLUMN IF NOT EXISTS diferencial_outro text,
  -- Nota NOVRA (1-10 cada critério)
  ADD COLUMN IF NOT EXISTS nota_procura smallint,
  ADD COLUMN IF NOT EXISTS nota_concorrencia smallint,
  ADD COLUMN IF NOT EXISTS nota_margem smallint,
  ADD COLUMN IF NOT EXISTS nota_tempo_maquina smallint,
  ADD COLUMN IF NOT EXISTS nota_facilidade smallint,
  ADD COLUMN IF NOT EXISTS nota_devolucao smallint,
  ADD COLUMN IF NOT EXISTS nota_escalabilidade smallint,
  ADD COLUMN IF NOT EXISTS nota_kits smallint,
  ADD COLUMN IF NOT EXISTS nota_tendencia smallint,
  ADD COLUMN IF NOT EXISTS nota_giro smallint,
  ADD COLUMN IF NOT EXISTS nota_final numeric(5,2),
  -- Extras
  ADD COLUMN IF NOT EXISTS galeria_imagens text[],
  ADD COLUMN IF NOT EXISTS observacoes_internas text,
  ADD COLUMN IF NOT EXISTS data_ultima_pesquisa date,
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_produtos_arquivado ON public.produtos(arquivado);
