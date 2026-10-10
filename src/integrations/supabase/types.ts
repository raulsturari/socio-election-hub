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
      candidates: {
        Row: {
          ballot_name: string
          created_at: string
          id: number
          number: number
          office: string
          party: string
          updated_at: string
          year: number
        }
        Insert: {
          ballot_name: string
          created_at?: string
          id?: number
          number: number
          office: string
          party: string
          updated_at?: string
          year: number
        }
        Update: {
          ballot_name?: string
          created_at?: string
          id?: number
          number?: number
          office?: string
          party?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description: string
          id: string
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      elections: {
        Row: {
          created_at: string
          election_date: string | null
          id: number
          import_job_id: string | null
          office: string
          round: number
          updated_at: string
          validated: boolean
          year: number
        }
        Insert: {
          created_at?: string
          election_date?: string | null
          id?: number
          import_job_id?: string | null
          office: string
          round: number
          updated_at?: string
          validated?: boolean
          year: number
        }
        Update: {
          created_at?: string
          election_date?: string | null
          id?: number
          import_job_id?: string | null
          office?: string
          round?: number
          updated_at?: string
          validated?: boolean
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "elections_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_job_logs: {
        Row: {
          context: Json
          created_at: string
          id: number
          job_id: string
          level: string
          message: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: number
          job_id: string
          level: string
          message: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: number
          job_id?: string
          level?: string
          message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          coverage: Json
          created_at: string
          error: string | null
          file_name: string | null
          file_sha256: string | null
          finished_at: string | null
          id: string
          integrity: Json
          kind: string
          pipeline_version: string
          rows_read: number | null
          rows_written: number | null
          source_id: string
          source_last_modified: string | null
          source_url: string
          started_at: string
          status: Database["public"]["Enums"]["import_status"]
          updated_at: string
        }
        Insert: {
          coverage?: Json
          created_at?: string
          error?: string | null
          file_name?: string | null
          file_sha256?: string | null
          finished_at?: string | null
          id?: string
          integrity?: Json
          kind: string
          pipeline_version: string
          rows_read?: number | null
          rows_written?: number | null
          source_id: string
          source_last_modified?: string | null
          source_url: string
          started_at?: string
          status?: Database["public"]["Enums"]["import_status"]
          updated_at?: string
        }
        Update: {
          coverage?: Json
          created_at?: string
          error?: string | null
          file_name?: string | null
          file_sha256?: string | null
          finished_at?: string | null
          id?: string
          integrity?: Json
          kind?: string
          pipeline_version?: string
          rows_read?: number | null
          rows_written?: number | null
          source_id?: string
          source_last_modified?: string | null
          source_url?: string
          started_at?: string
          status?: Database["public"]["Enums"]["import_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_values: {
        Row: {
          created_at: string
          ibge_code: string
          import_job_id: string
          indicator_id: string
          updated_at: string
          value: number | null
          year: number
        }
        Insert: {
          created_at?: string
          ibge_code: string
          import_job_id: string
          indicator_id: string
          updated_at?: string
          value?: number | null
          year: number
        }
        Update: {
          created_at?: string
          ibge_code?: string
          import_job_id?: string
          indicator_id?: string
          updated_at?: string
          value?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_ibge_code_fkey"
            columns: ["ibge_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["ibge_code"]
          },
          {
            foreignKeyName: "indicator_values_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          created_at: string
          id: string
          methodology: string
          name: string
          source_id: string
          source_table: string
          source_variable: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          methodology: string
          name: string
          source_id: string
          source_table: string
          source_variable: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          methodology?: string
          name?: string
          source_id?: string
          source_table?: string
          source_variable?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_results: {
        Row: {
          candidate_id: number
          created_at: string
          election_id: number
          ibge_code: string
          import_job_id: string
          share: number | null
          updated_at: string
          valid_votes: number
          votes: number
          zones_count: number
        }
        Insert: {
          candidate_id: number
          created_at?: string
          election_id: number
          ibge_code: string
          import_job_id: string
          share?: number | null
          updated_at?: string
          valid_votes: number
          votes: number
          zones_count: number
        }
        Update: {
          candidate_id?: number
          created_at?: string
          election_id?: number
          ibge_code?: string
          import_job_id?: string
          share?: number | null
          updated_at?: string
          valid_votes?: number
          votes?: number
          zones_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "municipal_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_results_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_results_ibge_code_fkey"
            columns: ["ibge_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["ibge_code"]
          },
          {
            foreignKeyName: "municipal_results_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_turnout: {
        Row: {
          abstentions: number
          blank_votes: number
          created_at: string
          election_id: number
          eligible: number
          ibge_code: string
          import_job_id: string
          not_installed_voters: number
          null_votes: number
          turnout: number
          updated_at: string
          valid_votes: number
          zones_count: number
        }
        Insert: {
          abstentions: number
          blank_votes: number
          created_at?: string
          election_id: number
          eligible: number
          ibge_code: string
          import_job_id: string
          not_installed_voters?: number
          null_votes: number
          turnout: number
          updated_at?: string
          valid_votes: number
          zones_count: number
        }
        Update: {
          abstentions?: number
          blank_votes?: number
          created_at?: string
          election_id?: number
          eligible?: number
          ibge_code?: string
          import_job_id?: string
          not_installed_voters?: number
          null_votes?: number
          turnout?: number
          updated_at?: string
          valid_votes?: number
          zones_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "municipal_turnout_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_turnout_ibge_code_fkey"
            columns: ["ibge_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["ibge_code"]
          },
          {
            foreignKeyName: "municipal_turnout_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string
          ibge_code: string
          is_capital: boolean
          name: string
          tse_code: number | null
          uf: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ibge_code: string
          is_capital?: boolean
          name: string
          tse_code?: number | null
          uf: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ibge_code?: string
          is_capital?: boolean
          name?: string
          tse_code?: number | null
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      zone_results: {
        Row: {
          candidate_id: number
          created_at: string
          election_id: number
          ibge_code: string
          import_job_id: string
          updated_at: string
          votes: number
          zone: number
        }
        Insert: {
          candidate_id: number
          created_at?: string
          election_id: number
          ibge_code: string
          import_job_id: string
          updated_at?: string
          votes: number
          zone: number
        }
        Update: {
          candidate_id?: number
          created_at?: string
          election_id?: number
          ibge_code?: string
          import_job_id?: string
          updated_at?: string
          votes?: number
          zone?: number
        }
        Relationships: [
          {
            foreignKeyName: "zone_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_results_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_results_ibge_code_fkey"
            columns: ["ibge_code"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["ibge_code"]
          },
          {
            foreignKeyName: "zone_results_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      duel_dataset: {
        Args: {
          _b_id: number
          _election_id: number
          _l_id: number
          _uf?: string
        }
        Returns: {
          b_votes: number
          ibge_code: string
          l_votes: number
          name: string
          uf: string
          valid_votes: number
        }[]
      }
      election_summary: {
        Args: { _election_id: number; _uf?: string }
        Returns: {
          ballot_name: string
          candidate_id: number
          number: number
          party: string
          share: number
          votes: number
        }[]
      }
      lab_dataset: {
        Args: {
          _base_election_id?: number
          _candidate_number?: number
          _election_id: number
          _metric: string
          _uf?: string
          _x?: string
        }
        Returns: {
          eligible: number
          ibge_code: string
          name: string
          populacao: number
          renda: number
          superior: number
          uf: string
          x: number
          y: number
        }[]
      }
      turnout_summary: {
        Args: { _election_id: number; _ibge?: string; _uf?: string }
        Returns: {
          abstentions: number
          blank_votes: number
          eligible: number
          municipalities: number
          null_votes: number
          turnout: number
          valid_votes: number
        }[]
      }
    }
    Enums: {
      import_status: "pending" | "running" | "succeeded" | "failed"
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
    Enums: {
      import_status: ["pending", "running", "succeeded", "failed"],
    },
  },
} as const
