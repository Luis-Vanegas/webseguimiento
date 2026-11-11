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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      actas: {
        Row: {
          asistentes: string | null
          created_at: string
          fecha: string
          id: string
          notas: string | null
          origen: string
        }
        Insert: {
          asistentes?: string | null
          created_at?: string
          fecha: string
          id?: string
          notas?: string | null
          origen: string
        }
        Update: {
          asistentes?: string | null
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          origen?: string
        }
        Relationships: []
      }
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
      compromisos: {
        Row: {
          acta_id: string
          actividad: string
          created_at: string
          criterio_fecha: string | null
          estado: string
          fecha_vencimiento: string | null
          id: string
          responsable: string | null
        }
        Insert: {
          acta_id: string
          actividad: string
          created_at?: string
          criterio_fecha?: string | null
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          responsable?: string | null
        }
        Update: {
          acta_id?: string
          actividad?: string
          created_at?: string
          criterio_fecha?: string | null
          estado?: string
          fecha_vencimiento?: string | null
          id?: string
          responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compromisos_acta_id_fkey"
            columns: ["acta_id"]
            isOneToOne: false
            referencedRelation: "actas"
            referencedColumns: ["id"]
          },
        ]
      }
      est_dependencias: {
        Row: {
          cen_gestor: number
          nombre: string
        }
        Insert: {
          cen_gestor: number
          nombre: string
        }
        Update: {
          cen_gestor?: number
          nombre?: string
        }
        Relationships: []
      }
      est_proyectos_estrategicos: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: never
          nombre: string
        }
        Update: {
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      est_reporte_aportes: {
        Row: {
          id: number
          porcentaje: number
          proyecto_estrategico_id: number
          reporte_id: number
          valor_aportado: number | null
        }
        Insert: {
          id?: never
          porcentaje: number
          proyecto_estrategico_id: number
          reporte_id: number
          valor_aportado?: number | null
        }
        Update: {
          id?: never
          porcentaje?: number
          proyecto_estrategico_id?: number
          reporte_id?: number
          valor_aportado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "est_reporte_aportes_proyecto_estrategico_id_fkey"
            columns: ["proyecto_estrategico_id"]
            isOneToOne: false
            referencedRelation: "est_proyectos_estrategicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "est_reporte_aportes_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "est_reportes"
            referencedColumns: ["id"]
          },
        ]
      }
      est_reportes: {
        Row: {
          cen_gestor: number
          cod_bpin: string | null
          cod_sap: string
          correo: string | null
          created_at: string
          eje_financiera: number
          estado: string
          id: number
          nom_proyecto: string
          observaciones: string | null
          ppto_inicial: number
          reportado_por: string
          token: string
          total_ppto_actual: number
          updated_at: string
          vigencia: number
        }
        Insert: {
          cen_gestor: number
          cod_bpin?: string | null
          cod_sap: string
          correo?: string | null
          created_at?: string
          eje_financiera: number
          estado?: string
          id?: never
          nom_proyecto: string
          observaciones?: string | null
          ppto_inicial: number
          reportado_por: string
          token?: string
          total_ppto_actual: number
          updated_at?: string
          vigencia: number
        }
        Update: {
          cen_gestor?: number
          cod_bpin?: string | null
          cod_sap?: string
          correo?: string | null
          created_at?: string
          eje_financiera?: number
          estado?: string
          id?: never
          nom_proyecto?: string
          observaciones?: string | null
          ppto_inicial?: number
          reportado_por?: string
          token?: string
          total_ppto_actual?: number
          updated_at?: string
          vigencia?: number
        }
        Relationships: [
          {
            foreignKeyName: "est_reportes_cen_gestor_fkey"
            columns: ["cen_gestor"]
            isOneToOne: false
            referencedRelation: "est_dependencias"
            referencedColumns: ["cen_gestor"]
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
      museum_rooms: {
        Row: {
          content: Json
          room: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          room: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          room?: string
          updated_by?: string | null
        }
        Relationships: []
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
      est_v_consolidado: {
        Row: {
          cen_gestor: number | null
          cod_sap: string | null
          correo: string | null
          created_at: string | null
          dependencia: string | null
          eje_financiera: number | null
          nom_proyecto: string | null
          observaciones: string | null
          porcentaje: number | null
          ppto_inicial: number | null
          proyecto_estrategico: string | null
          reportado_por: string | null
          reporte: string | null
          total_ppto_actual: number | null
          updated_at: string | null
          valor_aportado: number | null
          vigencia: number | null
        }
        Relationships: [
          {
            foreignKeyName: "est_reportes_cen_gestor_fkey"
            columns: ["cen_gestor"]
            isOneToOne: false
            referencedRelation: "est_dependencias"
            referencedColumns: ["cen_gestor"]
          },
        ]
      }
    }
    Functions: {
      est_anular_reporte: { Args: { p_token: string }; Returns: undefined }
      est_guardar_reporte: {
        Args: { p: Json; p_token?: string }
        Returns: Json
      }
      est_obtener_reporte: { Args: { p_token: string }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
