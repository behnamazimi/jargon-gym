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
          id: string;
          is_builtin: boolean;
          is_public: boolean;
          name: string;
          owner_id: string;
          slug: string | null;
          updated_at: string;
          visibility: Database["public"]["Enums"]["domain_visibility"];
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_builtin?: boolean;
          is_public?: boolean;
          name: string;
          owner_id: string;
          slug?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["domain_visibility"];
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_builtin?: boolean;
          is_public?: boolean;
          name?: string;
          owner_id?: string;
          slug?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["domain_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "domains_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      narration_allowlist: {
        Row: {
          added_by: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "narration_allowlist_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "narration_allowlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      narration_settings: {
        Row: {
          enabled: boolean;
          id: boolean;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
      review_events: {
        Row: {
          created_at: string;
          event: Database["public"]["Enums"]["review_event"];
          grade: number | null;
          id: string;
          question_type: string | null;
          quiz_knowledge_posterior: number | null;
          recall_difficulty: number | null;
          recall_stability: number | null;
          retrievability_before: number | null;
          term_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event: Database["public"]["Enums"]["review_event"];
          grade?: number | null;
          id?: string;
          question_type?: string | null;
          quiz_knowledge_posterior?: number | null;
          recall_difficulty?: number | null;
          recall_stability?: number | null;
          retrievability_before?: number | null;
          term_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event?: Database["public"]["Enums"]["review_event"];
          grade?: number | null;
          id?: string;
          question_type?: string | null;
          quiz_knowledge_posterior?: number | null;
          recall_difficulty?: number | null;
          recall_stability?: number | null;
          retrievability_before?: number | null;
          term_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_events_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      review_state: {
        Row: {
          ever_mastered_at: string | null;
          last_quiz_tested_at: string | null;
          last_read_at: string | null;
          last_review_recall_at: string | null;
          quiz_knowledge_posterior: number | null;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number | null;
          recall_stability: number | null;
          review_recall_count: number;
          term_id: string;
          user_id: string;
        };
        Insert: {
          ever_mastered_at?: string | null;
          last_quiz_tested_at?: string | null;
          last_read_at?: string | null;
          last_review_recall_at?: string | null;
          quiz_knowledge_posterior?: number | null;
          quiz_test_count?: number;
          read_count?: number;
          recall_difficulty?: number | null;
          recall_stability?: number | null;
          review_recall_count?: number;
          term_id: string;
          user_id: string;
        };
        Update: {
          ever_mastered_at?: string | null;
          last_quiz_tested_at?: string | null;
          last_read_at?: string | null;
          last_review_recall_at?: string | null;
          quiz_knowledge_posterior?: number | null;
          quiz_test_count?: number;
          read_count?: number;
          recall_difficulty?: number | null;
          recall_stability?: number | null;
          review_recall_count?: number;
          term_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_state_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_state_user_id_fkey";
            columns: ["user_id"];
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
          last_keyboard_message_id: number | null;
          last_sent_at: string | null;
          link_token_expires_at: string | null;
          link_token_hash: string | null;
          linked_at: string | null;
          quiz_session: Json | null;
          quiz_setup: Json | null;
          review_session: Json | null;
          review_setup: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          all_caught_up_at?: string | null;
          cadence?: Database["public"]["Enums"]["telegram_cadence"];
          chat_id?: number | null;
          created_at?: string;
          last_keyboard_message_id?: number | null;
          last_sent_at?: string | null;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          quiz_session?: Json | null;
          quiz_setup?: Json | null;
          review_session?: Json | null;
          review_setup?: Json | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          all_caught_up_at?: string | null;
          cadence?: Database["public"]["Enums"]["telegram_cadence"];
          chat_id?: number | null;
          created_at?: string;
          last_keyboard_message_id?: number | null;
          last_sent_at?: string | null;
          link_token_expires_at?: string | null;
          link_token_hash?: string | null;
          linked_at?: string | null;
          quiz_session?: Json | null;
          quiz_setup?: Json | null;
          review_session?: Json | null;
          review_setup?: Json | null;
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
      term_narrations: {
        Row: {
          content_hash: string;
          created_at: string;
          status: string;
          storage_path: string | null;
          term_id: string;
          updated_at: string;
        };
        Insert: {
          content_hash: string;
          created_at?: string;
          status?: string;
          storage_path?: string | null;
          term_id: string;
          updated_at?: string;
        };
        Update: {
          content_hash?: string;
          created_at?: string;
          status?: string;
          storage_path?: string | null;
          term_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_narrations_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: true;
            referencedRelation: "terms";
            referencedColumns: ["id"];
          },
        ];
      };
      term_relationships: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          relationship_type: string;
          source_term_id: string;
          target_term_id: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          relationship_type: string;
          source_term_id: string;
          target_term_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          relationship_type?: string;
          source_term_id?: string;
          target_term_id?: string;
        };
        Relationships: [
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
          anti_example: string | null;
          category: string;
          controversy: string | null;
          created_at: string;
          definition: string;
          discussion: string | null;
          domain_id: string;
          example: string | null;
          id: string;
          mental_model: string | null;
          slug: string | null;
          term: string;
          updated_at: string;
        };
        Insert: {
          anti_example?: string | null;
          category: string;
          controversy?: string | null;
          created_at?: string;
          definition: string;
          discussion?: string | null;
          domain_id: string;
          example?: string | null;
          id?: string;
          mental_model?: string | null;
          slug?: string | null;
          term: string;
          updated_at?: string;
        };
        Update: {
          anti_example?: string | null;
          category?: string;
          controversy?: string | null;
          created_at?: string;
          definition?: string;
          discussion?: string | null;
          domain_id?: string;
          example?: string | null;
          id?: string;
          mental_model?: string | null;
          slug?: string | null;
          term?: string;
          updated_at?: string;
        };
        Relationships: [
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
          api_key_encrypted: string | null;
          api_key_last4: string | null;
          created_at: string;
          current_streak: number;
          last_active_date: string | null;
          longest_streak: number;
          provider: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          api_key_encrypted?: string | null;
          api_key_last4?: string | null;
          created_at?: string;
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          provider?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          api_key_encrypted?: string | null;
          api_key_last4?: string | null;
          created_at?: string;
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          provider?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
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
      waitlist_requests: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          normalized_email: string;
          referral_code_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          normalized_email: string;
          referral_code_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          normalized_email?: string;
          referral_code_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_requests_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_requests_referral_code_id_fkey";
            columns: ["referral_code_id"];
            isOneToOne: false;
            referencedRelation: "referral_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      widget_tokens: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          last_used_at: string | null;
          token_hash: string;
          user_id: string;
          widget_version: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          token_hash: string;
          user_id: string;
          widget_version?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          token_hash?: string;
          user_id?: string;
          widget_version?: string | null;
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
      bump_streak: { Args: { p_user_id: string }; Returns: undefined };
      can_read_domain: { Args: { p_domain_id: string }; Returns: boolean };
      can_read_term: { Args: { p_term_id: string }; Returns: boolean };
      claim_term_narration: {
        Args: { p_content_hash: string; p_term_id: string };
        Returns: {
          content_hash: string;
          created_at: string;
          status: string;
          storage_path: string | null;
          term_id: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "term_narrations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      complete_telegram_link: {
        Args: { p_chat_id: number; p_token_hash: string };
        Returns: string;
      };
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
      get_streak_history: {
        Args: { p_user_id: string };
        Returns: {
          day: string;
          is_active: boolean;
          quizzed_count: number;
          read_count: number;
          reviewed_count: number;
        }[];
      };
      get_term_card: {
        Args: { p_term_id: string; p_user_id: string };
        Returns: {
          anti_example: string;
          category: string;
          controversy: string;
          definition: string;
          discussion: string;
          domain_id: string;
          domain_name: string;
          example: string;
          id: string;
          mental_model: string;
          relationships: Json;
          term: string;
        }[];
      };
      get_trace_candidates: {
        Args: { p_domain_ids?: string[]; p_user_id: string };
        Returns: {
          created_at: string;
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      get_trace_state_for_term: {
        Args: { p_term_id: string; p_user_id: string };
        Returns: {
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
        }[];
      };
      has_narration_access: { Args: { p_user_id: string }; Returns: boolean };
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
      my_bump_streak: { Args: never; Returns: undefined };
      my_get_streak_history: {
        Args: never;
        Returns: {
          day: string;
          is_active: boolean;
          quizzed_count: number;
          read_count: number;
          reviewed_count: number;
        }[];
      };
      my_get_trace_candidates: {
        Args: { p_domain_ids?: string[] };
        Returns: {
          created_at: string;
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      my_get_trace_state_for_term: {
        Args: { p_term_id: string };
        Returns: {
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
        }[];
      };
      my_progress_state_by_domain: {
        Args: { p_domain_ids: string[] };
        Returns: {
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      my_record_review_event: {
        Args: {
          p_crossed_known_threshold?: boolean;
          p_event: Database["public"]["Enums"]["review_event"];
          p_grade?: number;
          p_question_type?: string;
          p_quiz_knowledge_posterior?: number;
          p_recall_difficulty?: number;
          p_recall_stability?: number;
          p_retrievability_before?: number;
          p_term_id: string;
        };
        Returns: undefined;
      };
      my_reset_domain_progress: {
        Args: { p_domain_id: string };
        Returns: undefined;
      };
      my_review_domain_ids: { Args: never; Returns: string[] };
      owns_domain: { Args: { p_domain_id: string }; Returns: boolean };
      progress_state_by_domain: {
        Args: { p_domain_ids: string[]; p_user_id: string };
        Returns: {
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      record_review_event: {
        Args: {
          p_crossed_known_threshold?: boolean;
          p_event: Database["public"]["Enums"]["review_event"];
          p_grade?: number;
          p_question_type?: string;
          p_quiz_knowledge_posterior?: number;
          p_recall_difficulty?: number;
          p_recall_stability?: number;
          p_retrievability_before?: number;
          p_term_id: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      record_telegram_send: { Args: { p_user_id: string }; Returns: undefined };
      redeem_referral_code: { Args: { p_code: string }; Returns: undefined };
      reset_domain_progress: {
        Args: { p_domain_id: string; p_user_id: string };
        Returns: undefined;
      };
      review_domain_ids: { Args: { p_user_id: string }; Returns: string[] };
      set_telegram_all_caught_up: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      update_telegram_cadence: {
        Args: { p_cadence: Database["public"]["Enums"]["telegram_cadence"] };
        Returns: undefined;
      };
    };
    Enums: {
      domain_visibility: "private" | "shared";
      review_event: "read" | "reveal" | "review_pass" | "review_fail" | "quiz_pass" | "quiz_fail";
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
      review_event: ["read", "reveal", "review_pass", "review_fail", "quiz_pass", "quiz_fail"],
      telegram_cadence: ["off", "6h", "12h", "24h"],
      user_role: ["admin", "member"],
    },
  },
} as const;
