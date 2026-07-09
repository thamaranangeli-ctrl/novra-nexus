
# Sistema NOVRA — Gestão de Impressão 3D

Escopo enorme. Proponho construir em fases entregáveis para você validar o rumo (design, UX, dados) antes de avançar em módulos avançados. Cada fase deixa o app funcional.

## Fase 1 — Fundação (esta entrega)
- Ativar **Lovable Cloud** (banco + storage + auth futura).
- Design system premium: Azul Petróleo #284B63, branco, cinza claro, preto. Tema claro/escuro, fontes refinadas (Inter + display), tokens em `styles.css`.
- Layout base: sidebar fixa colapsável, topbar com busca global e toggle de tema, animações suaves (framer-motion).
- Rotas: Dashboard, Produtos, Produção, Comercial, Controle, Roadmap, Configurações.
- **Modelagem completa no Supabase** (SKU como núcleo):
  - `produtos` (entidade central)
  - `ficha_producao` (1:1 produto)
  - `ficha_comercial` (1:1 produto)
  - `controle_estoque` (1:1 produto)
  - `movimentacoes` (N:1 produto — entrada/saída/venda/perda/ajuste)
  - `roadmap_tarefas` + `roadmap_checklist` + `roadmap_anexos`
  - `historico_alteracoes` (auditoria)
  - `produto_arquivos` (STL/3MF/GCODE/imagens)
  - Enums: status, prioridade, tipo_movimentacao, marketplace, coluna_kanban
  - **Trigger** que ao inserir produto cria automaticamente as fichas técnica/comercial/controle
  - **Trigger** de histórico em updates
  - RLS liberado nesta fase (single-tenant); preparado para auth depois
- Módulo **Produtos** completo: listagem sofisticada (tabela + cards), criar/editar/duplicar/excluir com confirmação, upload de foto, filtros, busca, ordenação, toasts.
- **Dashboard** com os cards de indicadores e placeholders elegantes para gráficos (dados reais assim que houver produtos).

## Fase 2 — Módulos operacionais
- **Produção**: ficha técnica estilo OrcaSlicer (visual), todos os campos, upload STL/3MF/GCODE.
- **Comercial**: todos os campos, botões copiar anúncio, links Shopee/ML, placeholders para IA (Lovable AI Gateway — implementar geração de título/descrição com Gemini).
- **Controle**: estoque + movimentações com histórico, atualização automática de saldos via trigger.
- Gráficos reais (Recharts): faturamento, vendas, lucro, estoque; timeline de novos produtos; alertas inteligentes.

## Fase 3 — Roadmap Kanban + Import/Export
- Kanban drag-and-drop (Backlog/Em andamento/Concluído), checklist, anexos, responsáveis.
- Importar Excel (upsert por SKU), exportar Excel/CSV/PDF.
- Indicadores automáticos agregados (margem média, mais vendidos, etc.).

## Fase 4 — Expansões futuras (preparadas na modelagem)
- CRM, Pedidos, Clientes, Fornecedores, Financeiro, Compras, Etiquetas.
- Integrações ML, Shopee, WhatsApp, Google Drive, MakerWorld/Printables.

## Detalhes técnicos
- TanStack Start + Supabase + TanStack Query + shadcn/ui + framer-motion + Recharts + react-hook-form + zod.
- Server functions para leituras/escritas autenticadas (depois que auth entrar). Nesta fase, RLS aberta com política pública para agilizar validação.
- Storage buckets: `produto-imagens` (público), `produto-arquivos` (privado para STL/3MF/GCODE).
- Componentes reutilizáveis: `DataTable`, `StatCard`, `EmptyState`, `ConfirmDialog`, `PageHeader`, `FieldGroup`.

## Confirmações rápidas
1. **Autenticação**: adio para uma fase posterior (você usa sozinho no começo)? Ou já quero login desde o início?
2. **IA**: usar Lovable AI Gateway (Gemini) para gerar título/descrição — ok?
3. Posso começar pela **Fase 1** agora?
