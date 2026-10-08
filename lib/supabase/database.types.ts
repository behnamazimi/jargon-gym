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
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_credit_allocations: {
        Row: {
          amount: number;
          lot_id: number;
          spend_id: number;
        };
        Insert: {
          amount: number;
          lot_id: number;
          spend_id: number;
        };
        Update: {
          amount?: number;
          lot_id?: number;
          spend_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_credit_allocations_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "ai_credit_ledger";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_allocations_spend_id_fkey";
            columns: ["spend_id"];
            isOneToOne: false;
            referencedRelation: "ai_credit_ledger";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_credit_costs: {
        Row: {
          calls: number;
          characters: number | null;
          cost_micro_usd: number;
          created_at: string;
          input_tokens: number | null;
          model: string;
          output_tokens: number | null;
          provider: string;
          reasoning_tokens: number | null;
          spend_id: number;
        };
        Insert: {
          calls?: number;
          characters?: number | null;
          cost_micro_usd: number;
          created_at?: string;
          input_tokens?: number | null;
          model: string;
          output_tokens?: number | null;
          provider: string;
          reasoning_tokens?: number | null;
          spend_id: number;
        };
        Update: {
          calls?: number;
          characters?: number | null;
          cost_micro_usd?: number;
          created_at?: string;
          input_tokens?: number | null;
          model?: string;
          output_tokens?: number | null;
          provider?: string;
          reasoning_tokens?: number | null;
          spend_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_credit_costs_spend_id_fkey";
            columns: ["spend_id"];
            isOneToOne: true;
            referencedRelation: "ai_credit_ledger";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_credit_ledger: {
        Row: {
          amount: number;
          billable: boolean;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          feature: string | null;
          id: number;
          kind: string;
          lot_id: number | null;
          note: string | null;
          period_key: string | null;
          policy_id: number | null;
          price_id: number | null;
          reason: string | null;
          refund_of: number | null;
          source: string | null;
          units: number | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          billable?: boolean;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          feature?: string | null;
          id?: never;
          kind: string;
          lot_id?: number | null;
          note?: string | null;
          period_key?: string | null;
          policy_id?: number | null;
          price_id?: number | null;
          reason?: string | null;
          refund_of?: number | null;
          source?: string | null;
          units?: number | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          billable?: boolean;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          feature?: string | null;
          id?: never;
          kind?: string;
          lot_id?: number | null;
          note?: string | null;
          period_key?: string | null;
          policy_id?: number | null;
          price_id?: number | null;
          reason?: string | null;
          refund_of?: number | null;
          source?: string | null;
          units?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_ledger_feature_fkey";
            columns: ["feature", "billable"];
            isOneToOne: false;
            referencedRelation: "ai_feature_settings";
            referencedColumns: ["feature", "billable"];
          },
          {
            foreignKeyName: "ai_credit_ledger_lot_id_fkey";
            columns: ["lot_id"];
            isOneToOne: false;
            referencedRelation: "ai_credit_ledger";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_ledger_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "credit_grant_policies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_ledger_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "credit_prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_ledger_refund_of_fkey";
            columns: ["refund_of"];
            isOneToOne: false;
            referencedRelation: "ai_credit_ledger";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_credit_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_credit_settings: {
        Row: {
          default_margin: number;
          enabled: boolean;
          id: boolean;
          lots_after_id: number;
          peg_usd: number;
          updated_at: string;
        };
        Insert: {
          default_margin?: number;
          enabled?: boolean;
          id?: boolean;
          lots_after_id?: number;
          peg_usd?: number;
          updated_at?: string;
        };
        Update: {
          default_margin?: number;
          enabled?: boolean;
          id?: boolean;
          lots_after_id?: number;
          peg_usd?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_feature_allowlist: {
        Row: {
          created_at: string;
          feature: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feature: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feature?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feature_allowlist_feature_fkey";
            columns: ["feature"];
            isOneToOne: false;
            referencedRelation: "ai_feature_settings";
            referencedColumns: ["feature"];
          },
          {
            foreignKeyName: "ai_feature_allowlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_feature_runs: {
        Row: {
          feature: string;
          started_at: string;
          token: string;
          user_id: string;
        };
        Insert: {
          feature: string;
          started_at?: string;
          token: string;
          user_id: string;
        };
        Update: {
          feature?: string;
          started_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feature_runs_feature_fkey";
            columns: ["feature"];
            isOneToOne: false;
            referencedRelation: "ai_feature_settings";
            referencedColumns: ["feature"];
          },
          {
            foreignKeyName: "ai_feature_runs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_feature_settings: {
        Row: {
          access_mode: string;
          billable: boolean;
          daily_cap: number | null;
          elevenlabs_enabled: boolean;
          enabled: boolean;
          feature: string;
          murf_enabled: boolean;
          unit: string;
          updated_at: string;
        };
        Insert: {
          access_mode?: string;
          billable: boolean;
          daily_cap?: number | null;
          elevenlabs_enabled?: boolean;
          enabled?: boolean;
          feature: string;
          murf_enabled?: boolean;
          unit: string;
          updated_at?: string;
        };
        Update: {
          access_mode?: string;
          billable?: boolean;
          daily_cap?: number | null;
          elevenlabs_enabled?: boolean;
          enabled?: boolean;
          feature?: string;
          murf_enabled?: boolean;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          created_at: string;
          feature: string;
          id: number;
          outcome: string;
          provider: string | null;
          units: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feature: string;
          id?: never;
          outcome: string;
          provider?: string | null;
          units: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          feature?: string;
          id?: never;
          outcome?: string;
          provider?: string | null;
          units?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_feature_fkey";
            columns: ["feature"];
            isOneToOne: false;
            referencedRelation: "ai_feature_settings";
            referencedColumns: ["feature"];
          },
          {
            foreignKeyName: "ai_usage_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_worker_status: {
        Row: {
          last_secret: string;
          last_tick_at: string;
          source: string;
          worker: string;
        };
        Insert: {
          last_secret: string;
          last_tick_at?: string;
          source: string;
          worker: string;
        };
        Update: {
          last_secret?: string;
          last_tick_at?: string;
          source?: string;
          worker?: string;
        };
        Relationships: [];
      };
      audio_jobs: {
        Row: {
          attempts: number;
          content_hash: string;
          created_at: string;
          error: string | null;
          hash_version: number;
          id: string;
          provider: string | null;
          requested_at: string;
          status: string;
          storage_path: string | null;
          subject_id: string;
          subject_type: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          attempts?: number;
          content_hash: string;
          created_at?: string;
          error?: string | null;
          hash_version?: number;
          id?: string;
          provider?: string | null;
          requested_at?: string;
          status: string;
          storage_path?: string | null;
          subject_id: string;
          subject_type: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          attempts?: number;
          content_hash?: string;
          created_at?: string;
          error?: string | null;
          hash_version?: number;
          id?: string;
          provider?: string | null;
          requested_at?: string;
          status?: string;
          storage_path?: string | null;
          subject_id?: string;
          subject_type?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      collection_loves: {
        Row: {
          created_at: string;
          domain_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          domain_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          domain_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_loves_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_loves_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_narration_settings: {
        Row: {
          domain_id: string;
          mode: string;
          updated_at: string;
        };
        Insert: {
          domain_id: string;
          mode: string;
          updated_at?: string;
        };
        Update: {
          domain_id?: string;
          mode?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_narration_settings_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: true;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_reports: {
        Row: {
          created_at: string;
          domain_id: string;
          id: string;
          note: string | null;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          domain_id: string;
          id?: string;
          note?: string | null;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          domain_id?: string;
          id?: string;
          note?: string | null;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_reports_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_request_settings: {
        Row: {
          enabled: boolean;
          estimate_days: number;
          id: boolean;
          paused: boolean;
          paused_estimate_days: number;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          estimate_days?: number;
          id?: boolean;
          paused?: boolean;
          paused_estimate_days?: number;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          estimate_days?: number;
          id?: boolean;
          paused?: boolean;
          paused_estimate_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      collection_requests: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          decline_note: string | null;
          decline_reason: string | null;
          delay_notified_at: string | null;
          delivered_domain_id: string | null;
          delivered_terms: number | null;
          delivery_kind: string | null;
          dismissed_at: string | null;
          due_at: string;
          email_failed: boolean;
          id: string;
          kind: string;
          known_terms: string | null;
          language: string;
          level: string | null;
          merged_into: string | null;
          needs_input_since: string | null;
          notify_email: boolean;
          question: string | null;
          ready_at: string | null;
          replied_at: string | null;
          size: number | null;
          status: string;
          target_domain_id: string | null;
          topic: string;
          updated_at: string;
          user_id: string;
          user_reply: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          decline_note?: string | null;
          decline_reason?: string | null;
          delay_notified_at?: string | null;
          delivered_domain_id?: string | null;
          delivered_terms?: number | null;
          delivery_kind?: string | null;
          dismissed_at?: string | null;
          due_at: string;
          email_failed?: boolean;
          id?: string;
          kind: string;
          known_terms?: string | null;
          language: string;
          level?: string | null;
          merged_into?: string | null;
          needs_input_since?: string | null;
          notify_email?: boolean;
          question?: string | null;
          ready_at?: string | null;
          replied_at?: string | null;
          size?: number | null;
          status?: string;
          target_domain_id?: string | null;
          topic: string;
          updated_at?: string;
          user_id: string;
          user_reply?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          decline_note?: string | null;
          decline_reason?: string | null;
          delay_notified_at?: string | null;
          delivered_domain_id?: string | null;
          delivered_terms?: number | null;
          delivery_kind?: string | null;
          dismissed_at?: string | null;
          due_at?: string;
          email_failed?: boolean;
          id?: string;
          kind?: string;
          known_terms?: string | null;
          language?: string;
          level?: string | null;
          merged_into?: string | null;
          needs_input_since?: string | null;
          notify_email?: boolean;
          question?: string | null;
          ready_at?: string | null;
          replied_at?: string | null;
          size?: number | null;
          status?: string;
          target_domain_id?: string | null;
          topic?: string;
          updated_at?: string;
          user_id?: string;
          user_reply?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "collection_requests_delivered_domain_id_fkey";
            columns: ["delivered_domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_requests_merged_into_fkey";
            columns: ["merged_into"];
            isOneToOne: false;
            referencedRelation: "collection_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_requests_target_domain_id_fkey";
            columns: ["target_domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_grant_policies: {
        Row: {
          accounts_created_from: string | null;
          accounts_created_to: string | null;
          amount: number;
          cadence: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          expiry_days: number | null;
          expiry_kind: string;
          id: number;
          on_request: boolean;
          only_when_balance_below: number | null;
          source: string;
        };
        Insert: {
          accounts_created_from?: string | null;
          accounts_created_to?: string | null;
          amount: number;
          cadence: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          expiry_days?: number | null;
          expiry_kind: string;
          id?: never;
          on_request?: boolean;
          only_when_balance_below?: number | null;
          source: string;
        };
        Update: {
          accounts_created_from?: string | null;
          accounts_created_to?: string | null;
          amount?: number;
          cadence?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          expiry_days?: number | null;
          expiry_kind?: string;
          id?: never;
          on_request?: boolean;
          only_when_balance_below?: number | null;
          source?: string;
        };
        Relationships: [];
      };
      credit_prices: {
        Row: {
          base_credits: number;
          created_at: string;
          created_by: string | null;
          credits_per_unit: number;
          effective_from: string;
          feature: string;
          id: number;
          margin: number | null;
          unit: string;
          unit_cost_usd: number | null;
          unit_size: number;
        };
        Insert: {
          base_credits?: number;
          created_at?: string;
          created_by?: string | null;
          credits_per_unit: number;
          effective_from?: string;
          feature: string;
          id?: never;
          margin?: number | null;
          unit: string;
          unit_cost_usd?: number | null;
          unit_size?: number;
        };
        Update: {
          base_credits?: number;
          created_at?: string;
          created_by?: string | null;
          credits_per_unit?: number;
          effective_from?: string;
          feature?: string;
          id?: never;
          margin?: number | null;
          unit?: string;
          unit_cost_usd?: number | null;
          unit_size?: number;
        };
        Relationships: [
          {
            foreignKeyName: "credit_prices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_prices_feature_fkey";
            columns: ["feature"];
            isOneToOne: false;
            referencedRelation: "ai_feature_settings";
            referencedColumns: ["feature"];
          },
        ];
      };
      domains: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_builtin: boolean;
          is_public: boolean;
          kind: string;
          language: string;
          love_count: number;
          name: string;
          owner_id: string;
          share_block_reason: string | null;
          share_blocked_at: string | null;
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
          kind?: string;
          language?: string;
          love_count?: number;
          name: string;
          owner_id: string;
          share_block_reason?: string | null;
          share_blocked_at?: string | null;
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
          kind?: string;
          language?: string;
          love_count?: number;
          name?: string;
          owner_id?: string;
          share_block_reason?: string | null;
          share_blocked_at?: string | null;
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
      import_batches: {
        Row: {
          created_at: string;
          domain_id: string | null;
          entry: string | null;
          format: string | null;
          id: string;
          result: Json;
          source: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          domain_id?: string | null;
          entry?: string | null;
          format?: string | null;
          id: string;
          result?: Json;
          source?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          domain_id?: string | null;
          entry?: string | null;
          format?: string | null;
          id?: string;
          result?: Json;
          source?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_batches_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_batches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_reports: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          page_path: string | null;
          screenshot_path: string | null;
          status: string;
          status_changed_at: string | null;
          user_agent: string | null;
          user_id: string;
          viewport: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind: string;
          page_path?: string | null;
          screenshot_path?: string | null;
          status?: string;
          status_changed_at?: string | null;
          user_agent?: string | null;
          user_id: string;
          viewport?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          page_path?: string | null;
          screenshot_path?: string | null;
          status?: string;
          status_changed_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
          viewport?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      narration_sync_jobs: {
        Row: {
          created_at: string;
          cursor: number;
          domain_id: string;
          failed_count: number;
          finished_at: string | null;
          generated_count: number;
          id: string;
          last_error: string | null;
          lease_expires_at: string | null;
          started_by: string | null;
          status: string;
          term_ids: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          cursor?: number;
          domain_id: string;
          failed_count?: number;
          finished_at?: string | null;
          generated_count?: number;
          id?: string;
          last_error?: string | null;
          lease_expires_at?: string | null;
          started_by?: string | null;
          status?: string;
          term_ids: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          cursor?: number;
          domain_id?: string;
          failed_count?: number;
          finished_at?: string | null;
          generated_count?: number;
          id?: string;
          last_error?: string | null;
          lease_expires_at?: string | null;
          started_by?: string | null;
          status?: string;
          term_ids?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "narration_sync_jobs_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "narration_sync_jobs_started_by_fkey";
            columns: ["started_by"];
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
          expires_at: string | null;
          grants_narration: boolean;
          id: string;
          is_active: boolean;
          label: string | null;
          max_uses: number;
          use_count: number;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          grants_narration?: boolean;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          max_uses?: number;
          use_count?: number;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          grants_narration?: boolean;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          max_uses?: number;
          use_count?: number;
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
      referral_redemptions: {
        Row: {
          code_id: string;
          id: string;
          redeemed_at: string;
          user_id: string | null;
        };
        Insert: {
          code_id: string;
          id?: string;
          redeemed_at?: string;
          user_id?: string | null;
        };
        Update: {
          code_id?: string;
          id?: string;
          redeemed_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referral_redemptions_code_id_fkey";
            columns: ["code_id"];
            isOneToOne: false;
            referencedRelation: "referral_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_redemptions_user_id_fkey";
            columns: ["user_id"];
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
          ever_learning_at: string | null;
          ever_mastered_at: string | null;
          last_quiz_tested_at: string | null;
          last_read_at: string | null;
          last_review_recall_at: string | null;
          marked_known_at: string | null;
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
          ever_learning_at?: string | null;
          ever_mastered_at?: string | null;
          last_quiz_tested_at?: string | null;
          last_read_at?: string | null;
          last_review_recall_at?: string | null;
          marked_known_at?: string | null;
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
          ever_learning_at?: string | null;
          ever_mastered_at?: string | null;
          last_quiz_tested_at?: string | null;
          last_read_at?: string | null;
          last_review_recall_at?: string | null;
          marked_known_at?: string | null;
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
      stories: {
        Row: {
          cefr_level: string;
          created_at: string;
          dismissed_at: string | null;
          domain_id: string | null;
          format: string;
          id: string;
          language: string;
          new_term_ids: string[];
          outline: string | null;
          piece_length: string;
          read_at: string | null;
          reading_level: string;
          segments: Json;
          term_ids: string[];
          title: string;
          tone: string;
          user_id: string;
          vote: number | null;
        };
        Insert: {
          cefr_level: string;
          created_at?: string;
          dismissed_at?: string | null;
          domain_id?: string | null;
          format: string;
          id?: string;
          language: string;
          new_term_ids?: string[];
          outline?: string | null;
          piece_length?: string;
          read_at?: string | null;
          reading_level: string;
          segments: Json;
          term_ids: string[];
          title: string;
          tone: string;
          user_id: string;
          vote?: number | null;
        };
        Update: {
          cefr_level?: string;
          created_at?: string;
          dismissed_at?: string | null;
          domain_id?: string | null;
          format?: string;
          id?: string;
          language?: string;
          new_term_ids?: string[];
          outline?: string | null;
          piece_length?: string;
          read_at?: string | null;
          reading_level?: string;
          segments?: Json;
          term_ids?: string[];
          title?: string;
          tone?: string;
          user_id?: string;
          vote?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stories_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      story_collection_prefs: {
        Row: {
          cefr_level: string;
          domain_id: string;
          piece_length: string;
          reading_level: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cefr_level: string;
          domain_id: string;
          piece_length?: string;
          reading_level: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cefr_level?: string;
          domain_id?: string;
          piece_length?: string;
          reading_level?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_collection_prefs_domain_id_fkey";
            columns: ["domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_collection_prefs_user_id_fkey";
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
          category: string | null;
          controversy: string | null;
          created_at: string;
          definition: string | null;
          discussion: string | null;
          domain_id: string;
          example: string | null;
          id: string;
          mental_model: string | null;
          note: string | null;
          slug: string | null;
          term: string;
          updated_at: string;
        };
        Insert: {
          anti_example?: string | null;
          category?: string | null;
          controversy?: string | null;
          created_at?: string;
          definition?: string | null;
          discussion?: string | null;
          domain_id: string;
          example?: string | null;
          id?: string;
          mental_model?: string | null;
          note?: string | null;
          slug?: string | null;
          term: string;
          updated_at?: string;
        };
        Update: {
          anti_example?: string | null;
          category?: string | null;
          controversy?: string | null;
          created_at?: string;
          definition?: string | null;
          discussion?: string | null;
          domain_id?: string;
          example?: string | null;
          id?: string;
          mental_model?: string | null;
          note?: string | null;
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
      triage_not_yet: {
        Row: {
          created_at: string;
          term_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          term_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          term_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "triage_not_yet_term_id_fkey";
            columns: ["term_id"];
            isOneToOne: false;
            referencedRelation: "terms";
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
          analytics_consent: string | null;
          analytics_consent_at: string | null;
          analytics_consent_version: string | null;
          created_at: string;
          current_streak: number;
          last_active_date: string | null;
          longest_streak: number;
          promo_dismissed: Json;
          promo_seen: string[];
          read_hide_question: boolean;
          read_narration_highlight: boolean;
          read_revealed_default: boolean;
          read_shadowing: boolean;
          read_shadowing_gap: number;
          read_shadowing_pause: boolean;
          read_shadowing_repeats: number;
          read_stories_default: boolean;
          read_tap_to_play: boolean;
          story_last_domain_id: string | null;
          term_layout: Json;
          timezone: string | null;
          tour_seen: string[];
          tour_status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analytics_consent?: string | null;
          analytics_consent_at?: string | null;
          analytics_consent_version?: string | null;
          created_at?: string;
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          promo_dismissed?: Json;
          promo_seen?: string[];
          read_hide_question?: boolean;
          read_narration_highlight?: boolean;
          read_revealed_default?: boolean;
          read_shadowing?: boolean;
          read_shadowing_gap?: number;
          read_shadowing_pause?: boolean;
          read_shadowing_repeats?: number;
          read_stories_default?: boolean;
          read_tap_to_play?: boolean;
          story_last_domain_id?: string | null;
          term_layout?: Json;
          timezone?: string | null;
          tour_seen?: string[];
          tour_status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analytics_consent?: string | null;
          analytics_consent_at?: string | null;
          analytics_consent_version?: string | null;
          created_at?: string;
          current_streak?: number;
          last_active_date?: string | null;
          longest_streak?: number;
          promo_dismissed?: Json;
          promo_seen?: string[];
          read_hide_question?: boolean;
          read_narration_highlight?: boolean;
          read_revealed_default?: boolean;
          read_shadowing?: boolean;
          read_shadowing_gap?: number;
          read_shadowing_pause?: boolean;
          read_shadowing_repeats?: number;
          read_stories_default?: boolean;
          read_tap_to_play?: boolean;
          story_last_domain_id?: string | null;
          term_layout?: Json;
          timezone?: string | null;
          tour_seen?: string[];
          tour_status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_story_last_domain_id_fkey";
            columns: ["story_last_domain_id"];
            isOneToOne: false;
            referencedRelation: "domains";
            referencedColumns: ["id"];
          },
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
          pending_referral_code: string | null;
          referral_code_ran_out: boolean;
          referral_verified: boolean;
          role: Database["public"]["Enums"]["user_role"];
          suspended_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          pending_referral_code?: string | null;
          referral_code_ran_out?: boolean;
          referral_verified?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          pending_referral_code?: string | null;
          referral_code_ran_out?: boolean;
          referral_verified?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_at?: string | null;
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
      _admin_audit_insert: {
        Args: {
          p_action: string;
          p_details: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      _admin_clean_reason: { Args: { p_reason: string }; Returns: string };
      _admin_manage_target: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          email: string;
          id: string;
          pending_referral_code: string | null;
          referral_code_ran_out: boolean;
          referral_verified: boolean;
          role: Database["public"]["Enums"]["user_role"];
          suspended_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "users";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _admin_people_using_collections: {
        Args: { p_owner: string };
        Returns: number;
      };
      _ai_credit_due_grants: {
        Args: { p_at: string; p_user_id: string };
        Returns: {
          amount: number;
          expires_at: string;
          period_key: string;
          policy_id: number;
          source: string;
        }[];
      };
      _ai_credit_lots: {
        Args: { p_user_id: string };
        Returns: {
          amount: number;
          created_at: string;
          expires_at: string;
          lot_id: number;
          remaining: number;
        }[];
      };
      _ai_credit_settle: { Args: { p_user_id: string }; Returns: string };
      _consume_referral_code: {
        Args: { p_code: string; p_user: string };
        Returns: undefined;
      };
      _counted_requests: {
        Args: { p_user: string };
        Returns: {
          created_at: string;
        }[];
      };
      _credit_policy_set_amount: {
        Args: { p_amount: number; p_source: string };
        Returns: undefined;
      };
      _credit_price_set: {
        Args: { p_base: number; p_feature: string; p_per_unit: number };
        Returns: undefined;
      };
      _import_terms_for: {
        Args: {
          p_destination: Json;
          p_entry?: string;
          p_format?: string;
          p_import_id: string;
          p_name_collision?: string;
          p_policy: string;
          p_relationships: Json;
          p_source?: string;
          p_terms: Json;
          p_user: string;
        };
        Returns: Json;
      };
      _promote_merged_children: { Args: { p_id: string }; Returns: undefined };
      _referral_code_problem: {
        Args: { p_row: Database["public"]["Tables"]["referral_codes"]["Row"] };
        Returns: string;
      };
      _system_audit_insert: {
        Args: {
          p_action: string;
          p_details: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      admin_ai_credit_failure_reasons: {
        Args: { p_limit?: number };
        Returns: {
          failures: number;
          last_seen: string;
          people: number;
          reason: string;
        }[];
      };
      admin_ai_credit_summary: {
        Args: never;
        Returns: {
          credits_spent: number;
          refund_users_24h: number;
          refunds_24h: number;
          spends_24h: number;
          total_users: number;
          users_exhausted: number;
          users_with_use: number;
        }[];
      };
      admin_ai_credit_usage: {
        Args: { p_limit?: number };
        Returns: {
          email: string;
          granted: number;
          last_activity: string;
          remaining: number;
          spent: number;
          user_id: string;
        }[];
      };
      admin_create_shared_referral_code: {
        Args: {
          p_code: string;
          p_expires_at: string;
          p_grants_narration?: boolean;
          p_label: string;
          p_max_uses: number;
        };
        Returns: {
          code: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          grants_narration: boolean;
          id: string;
          is_active: boolean;
          label: string | null;
          max_uses: number;
          use_count: number;
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
      admin_delete_user: {
        Args: { p_confirm_email: string; p_reason: string; p_user_id: string };
        Returns: undefined;
      };
      admin_deliver_existing_collection: {
        Args: { p_domain_id: string; p_request_id: string };
        Returns: Json;
      };
      admin_deliver_request: {
        Args: {
          p_format: string;
          p_name: string;
          p_relationships: Json;
          p_request_id: string;
          p_terms: Json;
        };
        Returns: Json;
      };
      admin_dismiss_collection_reports: {
        Args: { p_domain_id: string };
        Returns: number;
      };
      admin_fill_definitions: {
        Args: { p_request_id: string; p_terms: Json };
        Returns: Json;
      };
      admin_grant_ai_credits: {
        Args: {
          p_amount: number;
          p_expires_at?: string;
          p_note: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      admin_lift_share_lock: {
        Args: { p_domain_id: string; p_note?: string };
        Returns: undefined;
      };
      admin_list_collection_reports: {
        Args: { p_domain_id: string };
        Returns: {
          created_at: string;
          id: string;
          note: string;
          reason: string;
          reporter_email: string;
          status: string;
        }[];
      };
      admin_list_collections: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          is_builtin: boolean;
          is_public: boolean;
          kind: string;
          love_count: number;
          name: string;
          open_report_count: number;
          owner_email: string;
          owner_id: string;
          share_block_reason: string;
          share_blocked_at: string;
          slug: string;
          term_count: number;
          updated_at: string;
          visibility: Database["public"]["Enums"]["domain_visibility"];
        }[];
      };
      admin_list_shared_referral_codes: {
        Args: never;
        Returns: {
          code: string;
          created_at: string;
          expires_at: string;
          grants_narration: boolean;
          id: string;
          label: string;
          max_uses: number;
          status: string;
          use_count: number;
        }[];
      };
      admin_person_detail: {
        Args: { p_user_id: string };
        Returns: {
          ban_mismatch: boolean;
          current_streak: number;
          last_active_date: string;
          longest_streak: number;
          owned_collections: number;
          people_using_collections: number;
          referral_verified: boolean;
          suspended_at: string;
        }[];
      };
      admin_publish_collection: {
        Args: { p_domain_id: string; p_domain_slug: string; p_term_slugs: Json };
        Returns: string;
      };
      admin_queue_debug_terms: { Args: { p_user_id: string }; Returns: Json };
      admin_request_unfinished_terms: {
        Args: { p_request_id: string };
        Returns: {
          term: string;
        }[];
      };
      admin_reset_ai_credits: {
        Args: { p_note: string; p_user_id: string };
        Returns: undefined;
      };
      admin_set_ai_credit_settings: {
        Args: {
          p_monthly: number;
          p_narration_per_thousand: number;
          p_quiz_per_question: number;
          p_starter: number;
          p_story_base: number;
          p_story_per_term: number;
          p_topup: number;
        };
        Returns: undefined;
      };
      admin_set_narration_caps: {
        Args: { p_story_cap: number; p_term_cap: number };
        Returns: undefined;
      };
      admin_set_narration_enabled: {
        Args: { p_enabled: boolean };
        Returns: undefined;
      };
      admin_set_narration_provider: {
        Args: { p_enabled: boolean; p_provider: string };
        Returns: undefined;
      };
      admin_set_referral_code_active: {
        Args: { p_active: boolean; p_id: string };
        Returns: undefined;
      };
      admin_set_user_suspended: {
        Args: { p_reason: string; p_suspended: boolean; p_user_id: string };
        Returns: undefined;
      };
      admin_stop_sharing_collection: {
        Args: { p_domain_id: string; p_note: string; p_reason: string };
        Returns: undefined;
      };
      admin_write_audit: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_target_id?: string;
          p_target_type?: string;
        };
        Returns: undefined;
      };
      ai_credit_balance: {
        Args: { p_user_id: string };
        Returns: {
          enabled: boolean;
          remaining: number;
          total: number;
        }[];
      };
      ai_credit_price: {
        Args: { p_at?: string; p_feature: string; p_units: number };
        Returns: {
          credits: number;
          price_id: number;
        }[];
      };
      audio_job_object_path: {
        Args: {
          p_content_hash: string;
          p_hash_version: number;
          p_job_id: string;
          p_subject_id: string;
          p_subject_type: string;
        };
        Returns: string;
      };
      begin_ai_run: {
        Args: { p_feature: string; p_ttl_seconds?: number; p_user_id: string };
        Returns: string;
      };
      bump_streak: { Args: { p_user_id: string }; Returns: undefined };
      can_read_domain: { Args: { p_domain_id: string }; Returns: boolean };
      can_read_term: { Args: { p_term_id: string }; Returns: boolean };
      claim_audio_job: {
        Args: {
          p_content_hash: string;
          p_hash_version: number;
          p_regenerate?: boolean;
          p_subject_id: string;
          p_subject_type: string;
          p_user_id: string;
        };
        Returns: {
          attempts: number;
          content_hash: string;
          created_at: string;
          error: string | null;
          hash_version: number;
          id: string;
          provider: string | null;
          requested_at: string;
          status: string;
          storage_path: string | null;
          subject_id: string;
          subject_type: string;
          updated_at: string;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "audio_jobs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_narration_sync_tick: {
        Args: never;
        Returns: {
          cursor: number;
          job_id: string;
          term_count: number;
          term_id: string;
        }[];
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
          expires_at: string | null;
          grants_narration: boolean;
          id: string;
          is_active: boolean;
          label: string | null;
          max_uses: number;
          use_count: number;
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
      delete_own_account: {
        Args: { p_confirm_email: string };
        Returns: undefined;
      };
      end_ai_run: {
        Args: { p_feature: string; p_token: string; p_user_id: string };
        Returns: undefined;
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
          note: string;
          relationships: Json;
          term: string;
        }[];
      };
      get_term_cards: {
        Args: { p_term_ids: string[]; p_user_id: string };
        Returns: {
          anti_example: string;
          category: string;
          controversy: string;
          definition: string;
          discussion: string;
          domain_id: string;
          domain_language: string;
          domain_name: string;
          example: string;
          id: string;
          mental_model: string;
          note: string;
          relationships: Json;
          term: string;
        }[];
      };
      get_trace_candidates: {
        Args: { p_domain_ids?: string[]; p_user_id: string };
        Returns: {
          created_at: string;
          domain_id: string;
          ever_learning_at: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          marked_known_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      get_trace_candidates_json: {
        Args: { p_domain_ids?: string[]; p_user_id: string };
        Returns: Json;
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
      has_feature_access: {
        Args: { p_feature: string; p_user_id: string };
        Returns: boolean;
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
      my_add_not_yet_terms: {
        Args: { p_term_ids: string[] };
        Returns: undefined;
      };
      my_ai_credit_state: {
        Args: never;
        Returns: {
          enabled: boolean;
          remaining: number;
          total: number;
        }[];
      };
      my_bump_streak: { Args: never; Returns: undefined };
      my_cancel_collection_request: {
        Args: { p_id: string };
        Returns: undefined;
      };
      my_clear_not_yet_domain: {
        Args: { p_domain_id: string };
        Returns: undefined;
      };
      my_collection_request_quota: { Args: never; Returns: Json };
      my_create_collection_request: {
        Args: {
          p_kind: string;
          p_known_terms?: string;
          p_language: string;
          p_level?: string;
          p_notify_email?: boolean;
          p_size?: number;
          p_target_domain_id?: string;
          p_topic: string;
        };
        Returns: Json;
      };
      my_dismiss_collection_request: {
        Args: { p_id: string };
        Returns: undefined;
      };
      my_dismiss_promo: { Args: { p_id: string }; Returns: undefined };
      my_first_seen_at_by_term: {
        Args: { p_term_ids: string[] };
        Returns: {
          first_seen_at: string;
          term_id: string;
        }[];
      };
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
          ever_learning_at: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          marked_known_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      my_get_trace_candidates_json: {
        Args: { p_domain_ids?: string[] };
        Returns: Json;
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
      my_grade_distribution: {
        Args: never;
        Returns: {
          count: number;
          grade: number;
        }[];
      };
      my_import_terms: {
        Args: {
          p_destination: Json;
          p_entry?: string;
          p_format?: string;
          p_import_id: string;
          p_policy: string;
          p_relationships: Json;
          p_source?: string;
          p_terms: Json;
        };
        Returns: Json;
      };
      my_list_collection_requests: {
        Args: never;
        Returns: {
          accepted_at: string;
          created_at: string;
          decline_note: string;
          decline_reason: string;
          delay_notified_at: string;
          delivered_domain_id: string;
          delivered_domain_name: string;
          delivered_terms: number;
          delivery_kind: string;
          display_due_at: string;
          display_status: string;
          id: string;
          kind: string;
          language: string;
          notify_email: boolean;
          question: string;
          status: string;
          topic: string;
        }[];
      };
      my_mark_promos_seen: { Args: { p_keys: string[] }; Returns: undefined };
      my_mark_tour_chapter_seen: {
        Args: { p_all_chapters: string[]; p_chapter: string };
        Returns: undefined;
      };
      my_progress_state_by_domain: {
        Args: { p_domain_ids: string[] };
        Returns: {
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          marked_known_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      my_promo_usage: {
        Args: { p_cap: number };
        Returns: {
          reads: number;
          reviews: number;
        }[];
      };
      my_record_review_event: {
        Args: {
          p_crossed_known_threshold?: boolean;
          p_crossed_learning_threshold?: boolean;
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
      my_remove_not_yet_term: {
        Args: { p_term_id: string };
        Returns: undefined;
      };
      my_reply_collection_request: {
        Args: { p_id: string; p_reply: string };
        Returns: undefined;
      };
      my_report_collection: {
        Args: { p_domain_id: string; p_note?: string; p_reason: string };
        Returns: string;
      };
      my_reset_domain_progress: {
        Args: { p_domain_id: string };
        Returns: undefined;
      };
      my_review_domain_ids: { Args: never; Returns: string[] };
      my_self_topup_ai_credits: {
        Args: never;
        Returns: {
          added: number;
          remaining: number;
        }[];
      };
      my_set_collection_love: {
        Args: { p_domain_id: string; p_loved: boolean };
        Returns: number;
      };
      my_set_request_notify: {
        Args: { p_id: string; p_notify: boolean };
        Returns: undefined;
      };
      my_set_term_marked_known: {
        Args: { p_marked: boolean; p_term_id: string };
        Returns: undefined;
      };
      my_study_collection_term_counts: {
        Args: never;
        Returns: {
          domain_id: string;
          term_count: number;
        }[];
      };
      my_term_relationships_by_domain: {
        Args: { p_domain_id: string };
        Returns: {
          description: string;
          id: string;
          relationship_type: string;
          source_term_id: string;
          source_term_name: string;
          target_term_id: string;
          target_term_name: string;
        }[];
      };
      my_unfinished_term_counts: {
        Args: { p_domain_ids: string[] };
        Returns: {
          domain_id: string;
          unfinished_count: number;
        }[];
      };
      owns_domain: { Args: { p_domain_id: string }; Returns: boolean };
      progress_state_by_domain: {
        Args: { p_domain_ids: string[]; p_user_id: string };
        Returns: {
          domain_id: string;
          ever_mastered_at: string;
          last_quiz_tested_at: string;
          last_read_at: string;
          last_review_recall_at: string;
          marked_known_at: string;
          quiz_knowledge_posterior: number;
          quiz_test_count: number;
          read_count: number;
          recall_difficulty: number;
          recall_stability: number;
          review_recall_count: number;
          term_id: string;
        }[];
      };
      record_ai_credit_cost: {
        Args: {
          p_calls: number;
          p_characters: number;
          p_cost_micro_usd: number;
          p_input_tokens: number;
          p_model: string;
          p_output_tokens: number;
          p_provider: string;
          p_reasoning_tokens: number;
          p_spend_id: number;
        };
        Returns: undefined;
      };
      record_review_event: {
        Args: {
          p_crossed_known_threshold?: boolean;
          p_crossed_learning_threshold?: boolean;
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
      refund_ai_credits: {
        Args: { p_ledger_id: number; p_reason?: string };
        Returns: undefined;
      };
      reserve_ai_credits: {
        Args: { p_feature: string; p_units: number; p_user_id: string };
        Returns: {
          credits: number;
          ledger_id: number;
          remaining: number;
          status: string;
        }[];
      };
      reset_domain_progress: {
        Args: { p_domain_id: string; p_user_id: string };
        Returns: undefined;
      };
      review_domain_ids: { Args: { p_user_id: string }; Returns: string[] };
      set_telegram_all_caught_up: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      set_term_marked_known: {
        Args: { p_marked: boolean; p_term_id: string; p_user_id: string };
        Returns: undefined;
      };
      submit_issue_report: {
        Args: {
          p_body: string;
          p_id: string;
          p_kind: string;
          p_page_path?: string;
          p_screenshot_path?: string;
          p_user_agent?: string;
          p_viewport?: string;
        };
        Returns: string;
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
