export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alertas_visita: {
        Row: {
          detalle: string | null
          id: string
          severidad: string
          tipo_alerta_id: string
          visita_id: string
        }
        Insert: {
          detalle?: string | null
          id?: string
          severidad: string
          tipo_alerta_id: string
          visita_id: string
        }
        Update: {
          detalle?: string | null
          id?: string
          severidad?: string
          tipo_alerta_id?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_visita_tipo_alerta_id_fkey"
            columns: ["tipo_alerta_id"]
            isOneToOne: false
            referencedRelation: "tipos_alerta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_recorrido: {
        Row: {
          id: string
          orden: number
          recorrido_id: string
          storage_path: string
        }
        Insert: {
          id?: string
          orden?: number
          recorrido_id: string
          storage_path: string
        }
        Update: {
          id?: string
          orden?: number
          recorrido_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_recorrido_recorrido_id_fkey"
            columns: ["recorrido_id"]
            isOneToOne: false
            referencedRelation: "recorridos_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_visita: {
        Row: {
          id: string
          orden: number
          punto_referencia_id: string | null
          storage_path: string
          visita_id: string
        }
        Insert: {
          id?: string
          orden?: number
          punto_referencia_id?: string | null
          storage_path: string
          visita_id: string
        }
        Update: {
          id?: string
          orden?: number
          punto_referencia_id?: string | null
          storage_path?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_visita_punto_referencia_id_fkey"
            columns: ["punto_referencia_id"]
            isOneToOne: false
            referencedRelation: "puntos_referencia_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_revision: {
        Row: {
          accion: string
          comentario: string | null
          fecha: string
          id: string
          usuario_id: string
          visita_id: string
        }
        Insert: {
          accion: string
          comentario?: string | null
          fecha?: string
          id?: string
          usuario_id: string
          visita_id: string
        }
        Update: {
          accion?: string
          comentario?: string | null
          fecha?: string
          id?: string
          usuario_id?: string
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_revision_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_revision_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      puntos_referencia_obra: {
        Row: {
          id: string
          nombre: string
          obra_id: number
        }
        Insert: {
          id?: string
          nombre: string
          obra_id: number
        }
        Update: {
          id?: string
          nombre?: string
          obra_id?: number
        }
        Relationships: []
      }
      recorridos_seguimiento: {
        Row: {
          autor_id: string
          created_at: string
          distancia_metros: number
          fecha_fin: string
          fecha_inicio: string
          id: string
          observaciones: string
          tipo: string
          titulo: string
          trazo: Json
        }
        Insert: {
          autor_id: string
          created_at?: string
          distancia_metros?: number
          fecha_fin: string
          fecha_inicio: string
          id?: string
          observaciones?: string
          tipo?: string
          titulo: string
          trazo: Json
        }
        Update: {
          autor_id?: string
          created_at?: string
          distancia_metros?: number
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          observaciones?: string
          tipo?: string
          titulo?: string
          trazo?: Json
        }
        Relationships: [
          {
            foreignKeyName: "recorridos_seguimiento_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_alerta: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id?: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      usuarios_seguimiento: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean
          id: string
          nombre: string
          rol: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      visitas_seguimiento: {
        Row: {
          autor_id: string
          autor_rol: string
          created_at: string
          estado: string
          fecha_proxima_visita: string | null
          fecha_revision: string | null
          fecha_visita: string
          id: string
          obra_id: number
          observaciones: string
          porcentaje_avance_campo: number
          porcentaje_pagado: number | null
          porcentaje_programado: number | null
          proximo_frente: string | null
          revisado_por: string | null
          updated_at: string
          visto_gerencia: boolean
        }
        Insert: {
          autor_id: string
          autor_rol: string
          created_at?: string
          estado: string
          fecha_proxima_visita?: string | null
          fecha_revision?: string | null
          fecha_visita: string
          id?: string
          obra_id: number
          observaciones?: string
          porcentaje_avance_campo: number
          porcentaje_pagado?: number | null
          porcentaje_programado?: number | null
          proximo_frente?: string | null
          revisado_por?: string | null
          updated_at?: string
          visto_gerencia?: boolean
        }
        Update: {
          autor_id?: string
          autor_rol?: string
          created_at?: string
          estado?: string
          fecha_proxima_visita?: string | null
          fecha_revision?: string | null
          fecha_visita?: string
          id?: string
          obra_id?: number
          observaciones?: string
          porcentaje_avance_campo?: number
          porcentaje_pagado?: number | null
          porcentaje_programado?: number | null
          proximo_frente?: string | null
          revisado_por?: string | null
          updated_at?: string
          visto_gerencia?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "visitas_seguimiento_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_seguimiento_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rol_actual: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

