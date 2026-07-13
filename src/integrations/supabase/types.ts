export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      controle_estoque: {
        Row: {
          avaliacoes: number | null
          created_at: string
          estoque_atual: number
          faturamento: number
          id: string
          lucro_total: number
          marketplace: Database["public"]["Enums"]["marketplace"] | null
          observacoes: string | null
          produto_id: string
          quantidade_produzida: number
          quantidade_vendida: number
          ultima_producao: string | null
          ultima_venda: string | null
          updated_at: string
        }
        Insert: {
          avaliacoes?: number | null
          created_at?: string
          estoque_atual?: number
          faturamento?: number
          id?: string
          lucro_total?: number
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          observacoes?: string | null
          produto_id: string
          quantidade_produzida?: number
          quantidade_vendida?: number
          ultima_producao?: string | null
          ultima_venda?: string | null
          updated_at?: string
        }
        Update: {
          avaliacoes?: number | null
          created_at?: string
          estoque_atual?: number
          faturamento?: number
          id?: string
          lucro_total?: number
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          observacoes?: string | null
          produto_id?: string
          quantidade_produzida?: number
          quantidade_vendida?: number
          ultima_producao?: string | null
          ultima_venda?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controle_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_fixos: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      embalagens: {
        Row: {
          created_at: string
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          tipo: string | null
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      energia_config: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          updated_at: string
          valor_kwh: number
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_kwh?: number
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_kwh?: number
        }
        Relationships: []
      }
      ficha_comercial: {
        Row: {
          created_at: string
          descricao_completa: string | null
          descricao_curta: string | null
          id: string
          kit: string | null
          link_mercadolivre: string | null
          link_shopee: string | null
          lucro: number | null
          margem_percent: number | null
          marketplace: Database["public"]["Enums"]["marketplace"] | null
          palavras_chave: string | null
          preco: number | null
          preco_minimo: number | null
          preco_promocional: number | null
          produto_id: string
          status: string | null
          tags: string[] | null
          titulo_mercadolivre: string | null
          titulo_shopee: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao_completa?: string | null
          descricao_curta?: string | null
          id?: string
          kit?: string | null
          link_mercadolivre?: string | null
          link_shopee?: string | null
          lucro?: number | null
          margem_percent?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          palavras_chave?: string | null
          preco?: number | null
          preco_minimo?: number | null
          preco_promocional?: number | null
          produto_id: string
          status?: string | null
          tags?: string[] | null
          titulo_mercadolivre?: string | null
          titulo_shopee?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao_completa?: string | null
          descricao_curta?: string | null
          id?: string
          kit?: string | null
          link_mercadolivre?: string | null
          link_shopee?: string | null
          lucro?: number | null
          margem_percent?: number | null
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          palavras_chave?: string | null
          preco?: number | null
          preco_minimo?: number | null
          preco_promocional?: number | null
          produto_id?: string
          status?: string | null
          tags?: string[] | null
          titulo_mercadolivre?: string | null
          titulo_shopee?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_comercial_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_producao: {
        Row: {
          altura_camada_mm: number | null
          bico_mm: number | null
          consumo_estimado_g: number | null
          created_at: string
          custo_producao: number | null
          id: string
          infill_percent: number | null
          observacoes: string | null
          peso_final_g: number | null
          pla_consumido_g: number | null
          produto_id: string
          quantidade_suportes: number | null
          temperatura_bico: number | null
          temperatura_mesa: number | null
          tempo_real_min: number | null
          updated_at: string
          velocidade_mms: number | null
        }
        Insert: {
          altura_camada_mm?: number | null
          bico_mm?: number | null
          consumo_estimado_g?: number | null
          created_at?: string
          custo_producao?: number | null
          id?: string
          infill_percent?: number | null
          observacoes?: string | null
          peso_final_g?: number | null
          pla_consumido_g?: number | null
          produto_id: string
          quantidade_suportes?: number | null
          temperatura_bico?: number | null
          temperatura_mesa?: number | null
          tempo_real_min?: number | null
          updated_at?: string
          velocidade_mms?: number | null
        }
        Update: {
          altura_camada_mm?: number | null
          bico_mm?: number | null
          consumo_estimado_g?: number | null
          created_at?: string
          custo_producao?: number | null
          id?: string
          infill_percent?: number | null
          observacoes?: string | null
          peso_final_g?: number | null
          pla_consumido_g?: number | null
          produto_id?: string
          quantidade_suportes?: number | null
          temperatura_bico?: number | null
          temperatura_mesa?: number | null
          tempo_real_min?: number | null
          updated_at?: string
          velocidade_mms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ficha_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      filamentos: {
        Row: {
          cor: string | null
          created_at: string
          data_compra: string | null
          fornecedor: string | null
          id: string
          marca: string | null
          material: string | null
          nome: string
          observacoes: string | null
          peso_rolo_g: number
          updated_at: string
          valor_frete: number
          valor_pago: number
        }
        Insert: {
          cor?: string | null
          created_at?: string
          data_compra?: string | null
          fornecedor?: string | null
          id?: string
          marca?: string | null
          material?: string | null
          nome: string
          observacoes?: string | null
          peso_rolo_g?: number
          updated_at?: string
          valor_frete?: number
          valor_pago?: number
        }
        Update: {
          cor?: string | null
          created_at?: string
          data_compra?: string | null
          fornecedor?: string | null
          id?: string
          marca?: string | null
          material?: string | null
          nome?: string
          observacoes?: string | null
          peso_rolo_g?: number
          updated_at?: string
          valor_frete?: number
          valor_pago?: number
        }
        Relationships: []
      }
      historico_alteracoes: {
        Row: {
          acao: string
          created_at: string
          dados_antigos: Json | null
          dados_novos: Json | null
          descricao: string | null
          entidade: string
          id: string
          produto_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade: string
          id?: string
          produto_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade?: string
          id?: string
          produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_alteracoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      impressoras: {
        Row: {
          created_at: string
          id: string
          modelo: string | null
          nome: string
          observacoes: string | null
          potencia_watts: number
          updated_at: string
          valor_compra: number
          vida_util_horas: number
        }
        Insert: {
          created_at?: string
          id?: string
          modelo?: string | null
          nome: string
          observacoes?: string | null
          potencia_watts?: number
          updated_at?: string
          valor_compra?: number
          vida_util_horas?: number
        }
        Update: {
          created_at?: string
          id?: string
          modelo?: string | null
          nome?: string
          observacoes?: string | null
          potencia_watts?: number
          updated_at?: string
          valor_compra?: number
          vida_util_horas?: number
        }
        Relationships: []
      }
      marketplaces: {
        Row: {
          comissao_percent: number
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          taxa_fixa: number
          taxa_variavel_percent: number
          updated_at: string
        }
        Insert: {
          comissao_percent?: number
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          taxa_fixa?: number
          taxa_variavel_percent?: number
          updated_at?: string
        }
        Update: {
          comissao_percent?: number
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          taxa_fixa?: number
          taxa_variavel_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          created_at: string
          id: string
          marketplace: Database["public"]["Enums"]["marketplace"] | null
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          marketplace?: Database["public"]["Enums"]["marketplace"] | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_arquivos: {
        Row: {
          created_at: string
          id: string
          nome: string
          produto_id: string
          tamanho_bytes: number | null
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          produto_id: string
          tamanho_bytes?: number | null
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          produto_id?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_arquivos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_custos: {
        Row: {
          created_at: string
          custos_extras: number
          desperdicio_percent: number
          embalagem_id: string | null
          filamento_id: string | null
          frete_estimado: number
          id: string
          impressora_id: string | null
          lucro_desejado_percent: number
          observacoes: string | null
          peso_peca_g: number
          produto_id: string
          tempo_acabamento_min: number
          tempo_impressao_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custos_extras?: number
          desperdicio_percent?: number
          embalagem_id?: string | null
          filamento_id?: string | null
          frete_estimado?: number
          id?: string
          impressora_id?: string | null
          lucro_desejado_percent?: number
          observacoes?: string | null
          peso_peca_g?: number
          produto_id: string
          tempo_acabamento_min?: number
          tempo_impressao_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custos_extras?: number
          desperdicio_percent?: number
          embalagem_id?: string | null
          filamento_id?: string | null
          frete_estimado?: number
          id?: string
          impressora_id?: string | null
          lucro_desejado_percent?: number
          observacoes?: string | null
          peso_peca_g?: number
          produto_id?: string
          tempo_acabamento_min?: number
          tempo_impressao_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_custos_embalagem_id_fkey"
            columns: ["embalagem_id"]
            isOneToOne: false
            referencedRelation: "embalagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_custos_filamento_id_fkey"
            columns: ["filamento_id"]
            isOneToOne: false
            referencedRelation: "filamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_custos_impressora_id_fkey"
            columns: ["impressora_id"]
            isOneToOne: false
            referencedRelation: "impressoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_custos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          acabamento: string | null
          categoria: string | null
          cor_principal: string | null
          cor_secundaria: string | null
          created_at: string
          descricao: string | null
          dificuldade: number | null
          embalagem: string | null
          foto_url: string | null
          id: string
          linha: string | null
          link_makerworld: string | null
          link_printables: string | null
          necessita_suportes: boolean | null
          nome: string
          observacoes: string | null
          peso_g: number | null
          prioridade: Database["public"]["Enums"]["prioridade"]
          sku: string
          status: Database["public"]["Enums"]["produto_status"]
          tempo_impressao_min: number | null
          updated_at: string
        }
        Insert: {
          acabamento?: string | null
          categoria?: string | null
          cor_principal?: string | null
          cor_secundaria?: string | null
          created_at?: string
          descricao?: string | null
          dificuldade?: number | null
          embalagem?: string | null
          foto_url?: string | null
          id?: string
          linha?: string | null
          link_makerworld?: string | null
          link_printables?: string | null
          necessita_suportes?: boolean | null
          nome: string
          observacoes?: string | null
          peso_g?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          sku: string
          status?: Database["public"]["Enums"]["produto_status"]
          tempo_impressao_min?: number | null
          updated_at?: string
        }
        Update: {
          acabamento?: string | null
          categoria?: string | null
          cor_principal?: string | null
          cor_secundaria?: string | null
          created_at?: string
          descricao?: string | null
          dificuldade?: number | null
          embalagem?: string | null
          foto_url?: string | null
          id?: string
          linha?: string | null
          link_makerworld?: string | null
          link_printables?: string | null
          necessita_suportes?: boolean | null
          nome?: string
          observacoes?: string | null
          peso_g?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          sku?: string
          status?: Database["public"]["Enums"]["produto_status"]
          tempo_impressao_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_anexos: {
        Row: {
          created_at: string
          id: string
          nome: string
          tarefa_id: string
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tarefa_id: string
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tarefa_id?: string
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_anexos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "roadmap_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_checklist: {
        Row: {
          concluido: boolean
          created_at: string
          id: string
          ordem: number | null
          tarefa_id: string
          texto: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          id?: string
          ordem?: number | null
          tarefa_id: string
          texto: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          id?: string
          ordem?: number | null
          tarefa_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_checklist_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "roadmap_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_tarefas: {
        Row: {
          coluna: Database["public"]["Enums"]["kanban_coluna"]
          created_at: string
          data_prevista: string | null
          descricao: string | null
          id: string
          ordem: number | null
          prioridade: Database["public"]["Enums"]["prioridade"]
          produto_id: string | null
          responsavel: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          coluna?: Database["public"]["Enums"]["kanban_coluna"]
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          produto_id?: string | null
          responsavel?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          coluna?: Database["public"]["Enums"]["kanban_coluna"]
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          prioridade?: Database["public"]["Enums"]["prioridade"]
          produto_id?: string | null
          responsavel?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_tarefas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      kanban_coluna: "backlog" | "em_andamento" | "concluido"
      marketplace: "shopee" | "mercado_livre" | "ambos" | "nenhum"
      prioridade: "baixa" | "media" | "alta" | "urgente"
      produto_status:
        | "rascunho"
        | "em_desenvolvimento"
        | "em_teste"
        | "concluido"
        | "pausado"
        | "descontinuado"
      tipo_movimentacao:
        | "entrada"
        | "saida"
        | "venda"
        | "perda"
        | "ajuste"
        | "producao"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kanban_coluna: ["backlog", "em_andamento", "concluido"],
      marketplace: ["shopee", "mercado_livre", "ambos", "nenhum"],
      prioridade: ["baixa", "media", "alta", "urgente"],
      produto_status: [
        "rascunho",
        "em_desenvolvimento",
        "em_teste",
        "concluido",
        "pausado",
        "descontinuado",
      ],
      tipo_movimentacao: [
        "entrada",
        "saida",
        "venda",
        "perda",
        "ajuste",
        "producao",
      ],
    },
  },
} as const
