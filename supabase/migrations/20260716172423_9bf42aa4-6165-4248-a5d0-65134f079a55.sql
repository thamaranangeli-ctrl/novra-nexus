
-- ============ ENUM ============
DO $$ BEGIN
  CREATE TYPE public.venda_status AS ENUM ('recebida','em_producao','impressa','embalada','enviada','entregue','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ VENDAS ============
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT,
  marketplace TEXT NOT NULL,
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_cidade TEXT,
  observacoes TEXT,
  frete_cliente NUMERIC(12,2) NOT NULL DEFAULT 0,
  frete_novra NUMERIC(12,2) NOT NULL DEFAULT 0,
  codigo_rastreio TEXT,
  comissao_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  taxa_fixa NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxa_variavel_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  subtotal_produtos NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  receita_bruta NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  receita_liquida NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  lucro_bruto NUMERIC(14,2) NOT NULL DEFAULT 0,
  lucro_liquido NUMERIC(14,2) NOT NULL DEFAULT 0,
  margem_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  tempo_total_min INTEGER NOT NULL DEFAULT 0,
  lucro_por_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.venda_status NOT NULL DEFAULT 'recebida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated, anon;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all_vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_vendas_data ON public.vendas(data_venda DESC);
CREATE INDEX idx_vendas_status ON public.vendas(status);
CREATE INDEX idx_vendas_marketplace ON public.vendas(marketplace);

CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VENDA ITENS ============
CREATE TABLE public.venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  sku_snapshot TEXT NOT NULL DEFAULT '',
  nome_snapshot TEXT NOT NULL DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  peso_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  tempo_impressao_min INTEGER NOT NULL DEFAULT 0,
  custo_pla NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_energia NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_desgaste NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_embalagem NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_unitario_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_itens TO authenticated, anon;
GRANT ALL ON public.venda_itens TO service_role;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all_venda_itens" ON public.venda_itens FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_venda_itens_venda ON public.venda_itens(venda_id);
CREATE INDEX idx_venda_itens_produto ON public.venda_itens(produto_id);

-- ============ TRIGGERS DE PROPAGAÇÃO ============
CREATE OR REPLACE FUNCTION public.aplicar_venda_item(p_produto UUID, p_qtd INTEGER, p_subtotal NUMERIC, p_sign INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_produto IS NULL THEN RETURN; END IF;
  UPDATE public.controle_estoque
    SET quantidade_vendida = GREATEST(0, quantidade_vendida + p_sign * p_qtd),
        faturamento = GREATEST(0, faturamento + p_sign * p_subtotal),
        estoque_atual = estoque_atual - p_sign * p_qtd,
        ultima_venda = CASE WHEN p_sign > 0 THEN now() ELSE ultima_venda END
  WHERE produto_id = p_produto;
END $$;

CREATE OR REPLACE FUNCTION public.trg_venda_item_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status public.venda_status;
BEGIN
  SELECT status INTO v_status FROM public.vendas WHERE id = NEW.venda_id;
  IF v_status IS DISTINCT FROM 'cancelada' THEN
    PERFORM public.aplicar_venda_item(NEW.produto_id, NEW.quantidade, NEW.subtotal, 1);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_venda_item_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status public.venda_status;
BEGIN
  SELECT status INTO v_status FROM public.vendas WHERE id = OLD.venda_id;
  IF v_status IS NULL OR v_status <> 'cancelada' THEN
    PERFORM public.aplicar_venda_item(OLD.produto_id, OLD.quantidade, OLD.subtotal, -1);
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.trg_venda_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelada' AND NEW.status = 'cancelada' THEN
    FOR r IN SELECT produto_id, quantidade, subtotal FROM public.venda_itens WHERE venda_id = NEW.id LOOP
      PERFORM public.aplicar_venda_item(r.produto_id, r.quantidade, r.subtotal, -1);
    END LOOP;
  ELSIF OLD.status = 'cancelada' AND NEW.status IS DISTINCT FROM 'cancelada' THEN
    FOR r IN SELECT produto_id, quantidade, subtotal FROM public.venda_itens WHERE venda_id = NEW.id LOOP
      PERFORM public.aplicar_venda_item(r.produto_id, r.quantidade, r.subtotal, 1);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_venda_item_after_ins AFTER INSERT ON public.venda_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_venda_item_ins();
CREATE TRIGGER trg_venda_item_after_del AFTER DELETE ON public.venda_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_venda_item_del();
CREATE TRIGGER trg_venda_status_after_upd AFTER UPDATE OF status ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.trg_venda_status_change();
