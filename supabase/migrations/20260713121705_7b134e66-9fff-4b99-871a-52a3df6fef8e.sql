
-- Filamentos
CREATE TABLE public.filamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca TEXT,
  material TEXT,
  cor TEXT,
  peso_rolo_g NUMERIC(10,2) NOT NULL DEFAULT 1000,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  data_compra DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filamentos TO anon, authenticated;
GRANT ALL ON public.filamentos TO service_role;
ALTER TABLE public.filamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access filamentos" ON public.filamentos FOR ALL USING (true) WITH CHECK (true);

-- Impressoras
CREATE TABLE public.impressoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modelo TEXT,
  valor_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  vida_util_horas NUMERIC(12,2) NOT NULL DEFAULT 10000,
  potencia_watts NUMERIC(10,2) NOT NULL DEFAULT 150,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impressoras TO anon, authenticated;
GRANT ALL ON public.impressoras TO service_role;
ALTER TABLE public.impressoras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access impressoras" ON public.impressoras FOR ALL USING (true) WITH CHECK (true);

-- Embalagens
CREATE TABLE public.embalagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.embalagens TO anon, authenticated;
GRANT ALL ON public.embalagens TO service_role;
ALTER TABLE public.embalagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access embalagens" ON public.embalagens FOR ALL USING (true) WITH CHECK (true);

-- Custos Fixos
CREATE TABLE public.custos_fixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  valor_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos_fixos TO anon, authenticated;
GRANT ALL ON public.custos_fixos TO service_role;
ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access custos_fixos" ON public.custos_fixos FOR ALL USING (true) WITH CHECK (true);

-- Marketplaces
CREATE TABLE public.marketplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  comissao_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  taxa_fixa NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxa_variavel_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplaces TO anon, authenticated;
GRANT ALL ON public.marketplaces TO service_role;
ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access marketplaces" ON public.marketplaces FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.marketplaces (nome, comissao_percent, taxa_fixa, taxa_variavel_percent, observacoes) VALUES
  ('Shopee', 20, 4, 0, 'Comissão + taxa fixa por venda'),
  ('Mercado Livre', 16, 6, 0, 'Clássico'),
  ('Site Próprio', 0, 0, 3.5, 'Apenas gateway de pagamento'),
  ('Amazon', 15, 0, 0, 'FBM');

-- Energia (singleton)
CREATE TABLE public.energia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_kwh NUMERIC(8,4) NOT NULL DEFAULT 0.85,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_config TO anon, authenticated;
GRANT ALL ON public.energia_config TO service_role;
ALTER TABLE public.energia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access energia_config" ON public.energia_config FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.energia_config (valor_kwh) VALUES (0.85);

-- Produto custos
CREATE TABLE public.produto_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL UNIQUE REFERENCES public.produtos(id) ON DELETE CASCADE,
  filamento_id UUID REFERENCES public.filamentos(id) ON DELETE SET NULL,
  impressora_id UUID REFERENCES public.impressoras(id) ON DELETE SET NULL,
  embalagem_id UUID REFERENCES public.embalagens(id) ON DELETE SET NULL,
  peso_peca_g NUMERIC(10,2) NOT NULL DEFAULT 0,
  tempo_impressao_min NUMERIC(10,2) NOT NULL DEFAULT 0,
  tempo_acabamento_min NUMERIC(10,2) NOT NULL DEFAULT 0,
  desperdicio_percent NUMERIC(6,3) NOT NULL DEFAULT 5,
  lucro_desejado_percent NUMERIC(6,3) NOT NULL DEFAULT 35,
  frete_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  custos_extras NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_custos TO anon, authenticated;
GRANT ALL ON public.produto_custos TO service_role;
ALTER TABLE public.produto_custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access produto_custos" ON public.produto_custos FOR ALL USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_filamentos_updated_at BEFORE UPDATE ON public.filamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_impressoras_updated_at BEFORE UPDATE ON public.impressoras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_embalagens_updated_at BEFORE UPDATE ON public.embalagens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_custos_fixos_updated_at BEFORE UPDATE ON public.custos_fixos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_marketplaces_updated_at BEFORE UPDATE ON public.marketplaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_energia_updated_at BEFORE UPDATE ON public.energia_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_produto_custos_updated_at BEFORE UPDATE ON public.produto_custos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
