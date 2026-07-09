
-- ============ ENUMS ============
CREATE TYPE public.produto_status AS ENUM ('rascunho','em_desenvolvimento','em_teste','concluido','pausado','descontinuado');
CREATE TYPE public.prioridade AS ENUM ('baixa','media','alta','urgente');
CREATE TYPE public.marketplace AS ENUM ('shopee','mercado_livre','ambos','nenhum');
CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada','saida','venda','perda','ajuste','producao');
CREATE TYPE public.kanban_coluna AS ENUM ('backlog','em_andamento','concluido');

-- ============ PRODUTOS (entidade central) ============
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  nome text NOT NULL,
  linha text,
  categoria text,
  foto_url text,
  descricao text,
  status public.produto_status NOT NULL DEFAULT 'rascunho',
  prioridade public.prioridade NOT NULL DEFAULT 'media',
  tempo_impressao_min integer,
  peso_g numeric(10,2),
  dificuldade smallint CHECK (dificuldade BETWEEN 1 AND 5),
  necessita_suportes boolean DEFAULT false,
  acabamento text,
  cor_principal text,
  cor_secundaria text,
  embalagem text,
  observacoes text,
  link_makerworld text,
  link_printables text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_produtos_sku ON public.produtos(sku);
CREATE INDEX idx_produtos_status ON public.produtos(status);
CREATE INDEX idx_produtos_prioridade ON public.produtos(prioridade);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);

-- ============ FICHA COMERCIAL ============
CREATE TABLE public.ficha_comercial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL UNIQUE REFERENCES public.produtos(id) ON DELETE CASCADE,
  titulo_shopee text,
  titulo_mercadolivre text,
  preco numeric(12,2),
  preco_promocional numeric(12,2),
  preco_minimo numeric(12,2),
  margem_percent numeric(6,2),
  lucro numeric(12,2),
  descricao_curta text,
  descricao_completa text,
  palavras_chave text,
  tags text[],
  kit text,
  marketplace public.marketplace DEFAULT 'nenhum',
  status text,
  link_shopee text,
  link_mercadolivre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ FICHA PRODUÇÃO ============
CREATE TABLE public.ficha_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL UNIQUE REFERENCES public.produtos(id) ON DELETE CASCADE,
  altura_camada_mm numeric(4,2),
  bico_mm numeric(4,2),
  temperatura_bico integer,
  temperatura_mesa integer,
  velocidade_mms integer,
  infill_percent numeric(5,2),
  quantidade_suportes integer,
  tempo_real_min integer,
  pla_consumido_g numeric(10,2),
  peso_final_g numeric(10,2),
  consumo_estimado_g numeric(10,2),
  custo_producao numeric(12,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CONTROLE / ESTOQUE ============
CREATE TABLE public.controle_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL UNIQUE REFERENCES public.produtos(id) ON DELETE CASCADE,
  estoque_atual integer NOT NULL DEFAULT 0,
  quantidade_produzida integer NOT NULL DEFAULT 0,
  quantidade_vendida integer NOT NULL DEFAULT 0,
  faturamento numeric(14,2) NOT NULL DEFAULT 0,
  lucro_total numeric(14,2) NOT NULL DEFAULT 0,
  avaliacoes numeric(3,2),
  marketplace public.marketplace DEFAULT 'nenhum',
  ultima_venda timestamptz,
  ultima_producao timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ MOVIMENTAÇÕES ============
CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo public.tipo_movimentacao NOT NULL,
  quantidade integer NOT NULL,
  valor_unitario numeric(12,2),
  valor_total numeric(14,2),
  marketplace public.marketplace,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_produto ON public.movimentacoes(produto_id);
CREATE INDEX idx_mov_tipo ON public.movimentacoes(tipo);
CREATE INDEX idx_mov_created ON public.movimentacoes(created_at DESC);

-- ============ ROADMAP ============
CREATE TABLE public.roadmap_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  prioridade public.prioridade NOT NULL DEFAULT 'media',
  coluna public.kanban_coluna NOT NULL DEFAULT 'backlog',
  responsavel text,
  data_prevista date,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.roadmap_tarefas(id) ON DELETE CASCADE,
  texto text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  ordem integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.roadmap_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.roadmap_tarefas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ARQUIVOS DO PRODUTO ============
CREATE TABLE public.produto_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text,
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ HISTÓRICO ============
CREATE TABLE public.historico_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  entidade text NOT NULL,
  acao text NOT NULL,
  descricao text,
  dados_antigos jsonb,
  dados_novos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hist_produto ON public.historico_alteracoes(produto_id);
CREATE INDEX idx_hist_created ON public.historico_alteracoes(created_at DESC);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_comercial TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ficha_producao TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controle_estoque TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_tarefas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_checklist TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_anexos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_arquivos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_alteracoes TO anon, authenticated;
GRANT ALL ON public.produtos, public.ficha_comercial, public.ficha_producao, public.controle_estoque,
             public.movimentacoes, public.roadmap_tarefas, public.roadmap_checklist, public.roadmap_anexos,
             public.produto_arquivos, public.historico_alteracoes TO service_role;

-- ============ RLS ============
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_alteracoes ENABLE ROW LEVEL SECURITY;

-- Fase 1: uso interno single-tenant. Políticas abertas; substituir por auth.uid()-scoped em fase futura.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['produtos','ficha_comercial','ficha_producao','controle_estoque',
    'movimentacoes','roadmap_tarefas','roadmap_checklist','roadmap_anexos','produto_arquivos','historico_alteracoes'])
  LOOP
    EXECUTE format('CREATE POLICY "open_all_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============ FUNÇÕES E TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fc_updated BEFORE UPDATE ON public.ficha_comercial FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.ficha_producao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ce_updated BEFORE UPDATE ON public.controle_estoque FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rt_updated BEFORE UPDATE ON public.roadmap_tarefas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria automaticamente fichas ao inserir produto
CREATE OR REPLACE FUNCTION public.criar_fichas_produto() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.ficha_comercial(produto_id) VALUES (NEW.id);
  INSERT INTO public.ficha_producao(produto_id) VALUES (NEW.id);
  INSERT INTO public.controle_estoque(produto_id) VALUES (NEW.id);
  INSERT INTO public.historico_alteracoes(produto_id, entidade, acao, descricao, dados_novos)
    VALUES (NEW.id, 'produto', 'criado', 'Produto criado: ' || NEW.sku, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_produtos_criar_fichas AFTER INSERT ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.criar_fichas_produto();

-- Histórico em updates
CREATE OR REPLACE FUNCTION public.log_produto_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.historico_alteracoes(produto_id, entidade, acao, descricao, dados_antigos, dados_novos)
  VALUES (NEW.id, 'produto', 'atualizado', 'Produto atualizado: ' || NEW.sku, to_jsonb(OLD), to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_produtos_log_update AFTER UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.log_produto_update();

-- Atualiza estoque a partir de movimentações
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE delta int; venda_valor numeric(14,2);
BEGIN
  delta := CASE NEW.tipo
    WHEN 'entrada' THEN NEW.quantidade
    WHEN 'producao' THEN NEW.quantidade
    WHEN 'ajuste' THEN NEW.quantidade
    WHEN 'saida' THEN -NEW.quantidade
    WHEN 'venda' THEN -NEW.quantidade
    WHEN 'perda' THEN -NEW.quantidade
    ELSE 0 END;

  UPDATE public.controle_estoque
    SET estoque_atual = estoque_atual + delta,
        quantidade_produzida = quantidade_produzida + CASE WHEN NEW.tipo='producao' THEN NEW.quantidade ELSE 0 END,
        quantidade_vendida = quantidade_vendida + CASE WHEN NEW.tipo='venda' THEN NEW.quantidade ELSE 0 END,
        faturamento = faturamento + CASE WHEN NEW.tipo='venda' THEN COALESCE(NEW.valor_total,0) ELSE 0 END,
        ultima_venda = CASE WHEN NEW.tipo='venda' THEN now() ELSE ultima_venda END,
        ultima_producao = CASE WHEN NEW.tipo='producao' THEN now() ELSE ultima_producao END
  WHERE produto_id = NEW.produto_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_mov_apply AFTER INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao();
