export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      domains: {
        Row: {
          created_at: string;
          description: string | null;
          icon_url: string | null;
          id: string;
          name: string;
          owner_id: string;
          visibility: Database["public"]["Enums"]["domain_visibility"];
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          visibility?: Database["public"]["Enums"]["domain_visibility"];
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          visibility?: Database["public"]["Enums"]["domain_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "domains_created_by_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_codes: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referral_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_codes_used_by_fkey";
            columns: ["used_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      telegram_links: {
        Row: {
          all_caught_up_at: string | null;
          cadence: Database["public"]["Enums"]["telegram_cadence"];
          chat_id: number | null;
          created_at: string;
          last_sent_at: string | null;
          link_token_expires_at: string | null;
          link_token_hash: string | null;
          linked_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          all_caught_up_at?: string | null;
          cadence?: Database["public"]["Enums"]["telegram_cadence"];
          chat_id?: number | null;
          created_at?: string;
          last_sent_at?: string | null;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          all_caught_up_at?: string | null;
          cadence?: Database["public"]["Enums"]["telegram_cadence"];
          chat_id?: number | null;
          created_at?: string;
          last_sent_at?: string | null;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      term_relationships: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          relationship_type: string;
          source_term_id: string;
          target_term_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          relationship_type: string;
          source_term_id: string;
          target_term_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          relationship_type?: string;
          source_term_id?: string;
          target_term_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_relationships_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_relationships_source_term_id_fkey";
            columns: ["source_term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_relationships_target_term_id_fkey";
            columns: ["target_term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
        ];
      };
      terms: {
        Row: {
          category: string;
          controversy: string | null;
          created_at: string;
          created_by: string | null;
          definition: string;
          discussion: string | null;
          domain_id: string;
          example: string | null;
          id: string;
          term: string;
        };
        Insert: {
          category: string;
          controversy?: string | null;
          created_at?: string;
          created_by?: string | null;
          definition: string;
          discussion?: string | null;
          domain_id: string;
          example?: string | null;
          id?: string;
          term: string;
        };
        Update: {
          category?: string;
          controversy?: string | null;
          created_at?: string;
          created_by?: string | null;
          definition?: string;
          discussion?: string | null;
          domain_id?: string;
          example?: string | null;
          id?: string;
          term?: string;
        };
        Relationships: [
          {
            foreignKeyName: "terms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "terms_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
        ];
      };
      user_active_domains: {
        Row: {
          domain_id: string;
          user_id: string;
        };
        Insert: {
          domain_id: string;
          user_id: string;
        };
        Update: {
          domain_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_active_domains_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_active_domains_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_collection_domains: {
        Row: {
          added_at: string;
          domain_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          domain_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          domain_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_collection_domains_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_collection_domains_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          api_key_encrypted: string;
          api_key_last4: string;
          created_at: string;
          mark_known_on_pass: boolean;
          mark_unknown_on_fail: boolean;
          provider: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          api_key_encrypted: string;
          api_key_last4: string;
          created_at?: string;
          mark_known_on_pass?: boolean;
          mark_unknown_on_fail?: boolean;
          provider: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          api_key_encrypted?: string;
          api_key_last4?: string;
          created_at?: string;
          mark_known_on_pass?: boolean;
          mark_unknown_on_fail?: boolean;
          provider?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_llm_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_progress: {
        Row: {
          is_known: boolean;
          term_id: string;
          user_id: string;
        };
        Insert: {
          is_known?: boolean;
          term_id: string;
          user_id: string;
        };
        Update: {
          is_known?: boolean;
          term_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          referral_verified: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          referral_verified?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          referral_verified?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      widget_tokens: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          last_used_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "widget_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_read_domain: { Args: { p_domain_id: string }; Returns: boolean };
      can_read_term: { Args: { p_term_id: string }; Returns: boolean };
      clear_term_known: {
        Args: { p_term_id: string; p_user_id: string };
        Returns: undefined;
      };
      complete_telegram_link: {
        Args: { p_chat_id: number; p_token_hash: string };
        Returns: string;
      };
      count_unknown_terms: { Args: { p_user_id: string }; Returns: number };
      create_referral_code: {
        Args: { p_code?: string };
        Returns: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          used_at: string | null;
          used_by: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "referral_codes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_term_card: {
        Args: { p_term_id: string; p_user_id: string };
        Returns: {
          category: string;
          controversy: string;
          definition: string;
          discussion: string;
          domain_id: string;
          domain_name: string;
          example: string;
          id: string;
          relationships: Json;
          term: string;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_domain_in_collection: {
        Args: { p_domain_id: string };
        Returns: boolean;
      };
      list_due_telegram_users: {
        Args: never;
        Returns: {
          chat_id: number;
          user_id: string;
        }[];
      };
      mark_term_known: {
        Args: { p_term_id: string; p_user_id: string };
        Returns: undefined;
      };
      my_clear_term_known: { Args: { p_term_id: string }; Returns: undefined };
      my_mark_term_known: { Args: { p_term_id: string }; Returns: undefined };
      my_review_domain_ids: { Args: never; Returns: string[] };
      owns_domain: { Args: { p_domain_id: string }; Returns: boolean };
      pick_random_unknown_term: {
        Args: { p_user_id: string };
        Returns: {
          category: string;
          controversy: string;
          definition: string;
          discussion: string;
          domain_id: string;
          domain_name: string;
          example: string;
          id: string;
          relationships: Json;
          term: string;
        }[];
      };
      record_telegram_send: { Args: { p_user_id: string }; Returns: undefined };
      redeem_referral_code: { Args: { p_code: string }; Returns: undefined };
      set_telegram_all_caught_up: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      telegram_review_domain_ids: {
        Args: { p_user_id: string };
        Returns: string[];
      };
      update_telegram_cadence: {
        Args: { p_cadence: Database["public"]["Enums"]["telegram_cadence"] };
        Returns: undefined;
      };
    };
    Enums: {
      domain_visibility: "private" | "shared";
      telegram_cadence: "off" | "6h" | "12h" | "24h";
      user_role: "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      domain_visibility: ["private", "shared"],
      telegram_cadence: ["off", "6h", "12h", "24h"],
      user_role: ["admin", "member"],
    },
  },
} as const;
