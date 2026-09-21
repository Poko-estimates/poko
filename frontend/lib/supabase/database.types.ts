export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string | null
          privacy_accepted: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name?: string | null
          privacy_accepted: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string | null
          privacy_accepted?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      issue_order: {
        Row: {
          issue_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          issue_id: string
          sort_order: number
          updated_at?: string
          user_id: string
        }
        Update: {
          issue_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_order_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_participants: {
        Row: {
          display_name: string
          issue_id: string
          joined_at: string
          user_id: string
          voted_at: string | null
          voted_round: number | null
        }
        Insert: {
          display_name: string
          issue_id: string
          joined_at?: string
          user_id?: string
          voted_at?: string | null
          voted_round?: number | null
        }
        Update: {
          display_name?: string
          issue_id?: string
          joined_at?: string
          user_id?: string
          voted_at?: string | null
          voted_round?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_participants_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          allow_participant_reveal?: boolean
          auto_close?: boolean
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          deck_name: string
          deck_values: string[]
          estimate?: string | null
          id?: string
          key?: string | null
          name: string
          owner_id?: string
          round?: number
          round_duration_seconds?: number | null
          round_ends_at?: string | null
          round_started_at?: string
          slug?: string
          sprint_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          allow_participant_reveal?: boolean
          auto_close?: boolean
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          deck_name?: string
          deck_values?: string[]
          estimate?: string | null
          id?: string
          key?: string | null
          name?: string
          owner_id?: string
          round?: number
          round_duration_seconds?: number | null
          round_ends_at?: string | null
          round_started_at?: string
          slug?: string
          sprint_id?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          tier: string
        }
        Insert: {
          created_at?: string
          id: string
          tier?: string
        }
        Update: {
          created_at?: string
          id?: string
          tier?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          issue_id: string
          round: number
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          issue_id: string
          round: number
          updated_at?: string
          user_id?: string
          value: string
        }
        Update: {
          created_at?: string
          issue_id?: string
          round?: number
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_participant_fkey"
            columns: ["issue_id", "user_id"]
            isOneToOne: false
            referencedRelation: "issue_participants"
            referencedColumns: ["issue_id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_round: {
        Args: { p_issue_id: string }
        Returns: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_own_account: { Args: never; Returns: undefined }
      delete_own_account: { Args: never; Returns: undefined }
      delete_sprint: {
        Args: {
          p_issues: string
          p_sprint_id: string
          p_target_sprint_id?: string
        }
        Returns: number
      }
      join_issue: {
        Args: { p_display_name?: string; p_slug: string }
        Returns: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      poko_deck_values_ok: { Args: { vals: string[] }; Returns: boolean }
      reopen_round: {
        Args: { p_issue_id: string }
        Returns: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_issues: { Args: { p_issue_ids: string[] }; Returns: undefined }
      set_estimate: {
        Args: { p_estimate: string; p_issue_id: string }
        Returns: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_round: {
        Args: { p_issue_id: string }
        Returns: {
          allow_participant_reveal: boolean
          auto_close: boolean
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          deck_name: string
          deck_values: string[]
          estimate: string | null
          id: string
          key: string | null
          name: string
          owner_id: string
          round: number
          round_duration_seconds: number | null
          round_ends_at: string | null
          round_started_at: string
          slug: string
          sprint_id: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "issues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
  public: {
    Enums: {},
  },
} as const

