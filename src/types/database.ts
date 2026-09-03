/**
 * Generated from the Supabase schema. Do not edit by hand.
 *
 * Regenerate after any migration with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audits: {
        Row: {
          accessibility_score: number | null;
          analysed_at: string | null;
          best_practices_score: number | null;
          cls: number | null;
          completed_at: string | null;
          created_at: string;
          device: Database["public"]["Enums"]["device_type"];
          duration_ms: number;
          error_code: string | null;
          failure_reason: string | null;
          fcp: number | null;
          field_cls: number | null;
          field_data_available: boolean;
          field_fcp_ms: number | null;
          field_inp_ms: number | null;
          field_lcp_ms: number | null;
          field_overall_category:
            | Database["public"]["Enums"]["crux_category"]
            | null;
          field_scope: Database["public"]["Enums"]["field_scope"] | null;
          field_ttfb_ms: number | null;
          final_url: string | null;
          health_score: number | null;
          id: string;
          inp: number | null;
          issues_found: number;
          lcp: number | null;
          lighthouse_version: string | null;
          owner_id: string;
          passed_checks: number;
          performance_score: number | null;
          provider: Database["public"]["Enums"]["audit_provider"];
          raw_response: Json | null;
          requested_url: string | null;
          seo_score: number | null;
          speed_index: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["audit_status"];
          tbt: number | null;
          total_checks: number;
          trigger: Database["public"]["Enums"]["audit_trigger"];
          ttfb: number | null;
          website_id: string;
        };
        Insert: {
          accessibility_score?: number | null;
          analysed_at?: string | null;
          best_practices_score?: number | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string;
          device?: Database["public"]["Enums"]["device_type"];
          duration_ms?: number;
          error_code?: string | null;
          failure_reason?: string | null;
          fcp?: number | null;
          field_cls?: number | null;
          field_data_available?: boolean;
          field_fcp_ms?: number | null;
          field_inp_ms?: number | null;
          field_lcp_ms?: number | null;
          field_overall_category?:
            | Database["public"]["Enums"]["crux_category"]
            | null;
          field_scope?: Database["public"]["Enums"]["field_scope"] | null;
          field_ttfb_ms?: number | null;
          final_url?: string | null;
          health_score?: number | null;
          id?: string;
          inp?: number | null;
          issues_found?: number;
          lcp?: number | null;
          lighthouse_version?: string | null;
          owner_id: string;
          passed_checks?: number;
          performance_score?: number | null;
          provider?: Database["public"]["Enums"]["audit_provider"];
          raw_response?: Json | null;
          requested_url?: string | null;
          seo_score?: number | null;
          speed_index?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["audit_status"];
          tbt?: number | null;
          total_checks?: number;
          trigger?: Database["public"]["Enums"]["audit_trigger"];
          ttfb?: number | null;
          website_id: string;
        };
        Update: {
          accessibility_score?: number | null;
          analysed_at?: string | null;
          best_practices_score?: number | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string;
          device?: Database["public"]["Enums"]["device_type"];
          duration_ms?: number;
          error_code?: string | null;
          failure_reason?: string | null;
          fcp?: number | null;
          field_cls?: number | null;
          field_data_available?: boolean;
          field_fcp_ms?: number | null;
          field_inp_ms?: number | null;
          field_lcp_ms?: number | null;
          field_overall_category?:
            | Database["public"]["Enums"]["crux_category"]
            | null;
          field_scope?: Database["public"]["Enums"]["field_scope"] | null;
          field_ttfb_ms?: number | null;
          final_url?: string | null;
          health_score?: number | null;
          id?: string;
          inp?: number | null;
          issues_found?: number;
          lcp?: number | null;
          lighthouse_version?: string | null;
          owner_id?: string;
          passed_checks?: number;
          performance_score?: number | null;
          provider?: Database["public"]["Enums"]["audit_provider"];
          raw_response?: Json | null;
          requested_url?: string | null;
          seo_score?: number | null;
          speed_index?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["audit_status"];
          tbt?: number | null;
          total_checks?: number;
          trigger?: Database["public"]["Enums"]["audit_trigger"];
          ttfb?: number | null;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audits_website_owner_fkey";
            columns: ["website_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "websites";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      issues: {
        Row: {
          affected_pages: string[];
          audit_id: string | null;
          category: Database["public"]["Enums"]["issue_category"];
          created_at: string;
          description: string;
          device: Database["public"]["Enums"]["device_type"] | null;
          display_value: string | null;
          effort: Database["public"]["Enums"]["effort_level"];
          found_at: string;
          id: string;
          kind: Database["public"]["Enums"]["finding_kind"];
          owner_id: string;
          provider: Database["public"]["Enums"]["audit_provider"];
          recommendation: string;
          rule_id: string;
          savings_ms: number | null;
          score_impact: number;
          severity: Database["public"]["Enums"]["issue_severity"];
          status: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at: string;
          website_id: string;
        };
        Insert: {
          affected_pages?: string[];
          audit_id?: string | null;
          category: Database["public"]["Enums"]["issue_category"];
          created_at?: string;
          description?: string;
          device?: Database["public"]["Enums"]["device_type"] | null;
          display_value?: string | null;
          effort?: Database["public"]["Enums"]["effort_level"];
          found_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["finding_kind"];
          owner_id: string;
          provider?: Database["public"]["Enums"]["audit_provider"];
          recommendation?: string;
          rule_id: string;
          savings_ms?: number | null;
          score_impact?: number;
          severity: Database["public"]["Enums"]["issue_severity"];
          status?: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          affected_pages?: string[];
          audit_id?: string | null;
          category?: Database["public"]["Enums"]["issue_category"];
          created_at?: string;
          description?: string;
          device?: Database["public"]["Enums"]["device_type"] | null;
          display_value?: string | null;
          effort?: Database["public"]["Enums"]["effort_level"];
          found_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["finding_kind"];
          owner_id?: string;
          provider?: Database["public"]["Enums"]["audit_provider"];
          recommendation?: string;
          rule_id?: string;
          savings_ms?: number | null;
          score_impact?: number;
          severity?: Database["public"]["Enums"]["issue_severity"];
          status?: Database["public"]["Enums"]["issue_status"];
          title?: string;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issues_audit_owner_fkey";
            columns: ["audit_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "issues_website_owner_fkey";
            columns: ["website_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "websites";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      profiles: {
        Row: {
          company: string;
          created_at: string;
          full_name: string;
          id: string;
          role: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          company?: string;
          created_at?: string;
          full_name?: string;
          id: string;
          role?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          company?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_preferences: {
        Row: {
          audit_frequency: Database["public"]["Enums"]["audit_frequency"];
          brand_name: string;
          created_at: string;
          default_device: Database["public"]["Enums"]["device_type"];
          notify_audit_completed: boolean;
          notify_critical_issues: boolean;
          notify_product_updates: boolean;
          notify_score_drops: boolean;
          notify_audit_failed: boolean;
          notify_weekly_digest: boolean;
          owner_id: string;
          report_title: string;
          score_threshold: number;
          updated_at: string;
        };
        Insert: {
          audit_frequency?: Database["public"]["Enums"]["audit_frequency"];
          brand_name?: string;
          created_at?: string;
          default_device?: Database["public"]["Enums"]["device_type"];
          notify_audit_completed?: boolean;
          notify_critical_issues?: boolean;
          notify_product_updates?: boolean;
          notify_score_drops?: boolean;
          notify_audit_failed?: boolean;
          notify_weekly_digest?: boolean;
          owner_id: string;
          report_title?: string;
          score_threshold?: number;
          updated_at?: string;
        };
        Update: {
          audit_frequency?: Database["public"]["Enums"]["audit_frequency"];
          brand_name?: string;
          created_at?: string;
          default_device?: Database["public"]["Enums"]["device_type"];
          notify_audit_completed?: boolean;
          notify_critical_issues?: boolean;
          notify_product_updates?: boolean;
          notify_score_drops?: boolean;
          notify_audit_failed?: boolean;
          notify_weekly_digest?: boolean;
          owner_id?: string;
          report_title?: string;
          score_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      uptime_daily: {
        Row: {
          check_count: number;
          day: string;
          last_checked_at: string;
          monitor_id: string;
          owner_id: string;
          response_max_ms: number | null;
          response_min_ms: number | null;
          response_sample_count: number;
          response_total_ms: number;
          success_count: number;
        };
        Insert: {
          check_count?: number;
          day: string;
          last_checked_at: string;
          monitor_id: string;
          owner_id: string;
          response_max_ms?: number | null;
          response_min_ms?: number | null;
          response_sample_count?: number;
          response_total_ms?: number;
          success_count?: number;
        };
        Update: {
          check_count?: number;
          day?: string;
          last_checked_at?: string;
          monitor_id?: string;
          owner_id?: string;
          response_max_ms?: number | null;
          response_min_ms?: number | null;
          response_sample_count?: number;
          response_total_ms?: number;
          success_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "uptime_daily_monitor_owner_fkey";
            columns: ["monitor_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "uptime_monitors";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      uptime_incidents: {
        Row: {
          created_at: string;
          detected_at: string;
          final_status_code: number | null;
          id: string;
          initial_error: string;
          monitor_id: string;
          owner_id: string;
          recovered_at: string | null;
        };
        Insert: {
          created_at?: string;
          detected_at?: string;
          final_status_code?: number | null;
          id?: string;
          initial_error?: string;
          monitor_id: string;
          owner_id: string;
          recovered_at?: string | null;
        };
        Update: {
          created_at?: string;
          detected_at?: string;
          final_status_code?: number | null;
          id?: string;
          initial_error?: string;
          monitor_id?: string;
          owner_id?: string;
          recovered_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "uptime_incidents_monitor_owner_fkey";
            columns: ["monitor_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "uptime_monitors";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      uptime_monitors: {
        Row: {
          consecutive_failures: number;
          created_at: string;
          enabled: boolean;
          expected_status_max: number;
          expected_status_min: number;
          id: string;
          interval_minutes: number;
          last_checked_at: string | null;
          last_error: string | null;
          last_response_ms: number | null;
          last_status_code: number | null;
          last_success_at: string | null;
          next_check_at: string | null;
          owner_id: string;
          state: Database["public"]["Enums"]["uptime_monitor_state"];
          timeout_ms: number;
          updated_at: string;
          website_id: string;
        };
        Insert: {
          consecutive_failures?: number;
          created_at?: string;
          enabled?: boolean;
          expected_status_max?: number;
          expected_status_min?: number;
          id?: string;
          interval_minutes?: number;
          last_checked_at?: string | null;
          last_error?: string | null;
          last_response_ms?: number | null;
          last_status_code?: number | null;
          last_success_at?: string | null;
          next_check_at?: string | null;
          owner_id: string;
          state?: Database["public"]["Enums"]["uptime_monitor_state"];
          timeout_ms?: number;
          updated_at?: string;
          website_id: string;
        };
        Update: {
          consecutive_failures?: number;
          created_at?: string;
          enabled?: boolean;
          expected_status_max?: number;
          expected_status_min?: number;
          id?: string;
          interval_minutes?: number;
          last_checked_at?: string | null;
          last_error?: string | null;
          last_response_ms?: number | null;
          last_status_code?: number | null;
          last_success_at?: string | null;
          next_check_at?: string | null;
          owner_id?: string;
          state?: Database["public"]["Enums"]["uptime_monitor_state"];
          timeout_ms?: number;
          updated_at?: string;
          website_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "uptime_monitors_website_owner_fkey";
            columns: ["website_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "websites";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      websites: {
        Row: {
          created_at: string;
          environment: Database["public"]["Enums"]["environment_type"];
          id: string;
          name: string;
          owner_id: string;
          status: Database["public"]["Enums"]["website_status"];
          tags: string[];
          team: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          environment?: Database["public"]["Enums"]["environment_type"];
          id?: string;
          name: string;
          owner_id: string;
          status?: Database["public"]["Enums"]["website_status"];
          tags?: string[];
          team?: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          environment?: Database["public"]["Enums"]["environment_type"];
          id?: string;
          name?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["website_status"];
          tags?: string[];
          team?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_due_uptime_monitors: {
        Args: { p_limit?: number };
        Returns: {
          expected_status_max: number;
          expected_status_min: number;
          monitor_id: string;
          target_url: string;
          timeout_ms: number;
        }[];
      };
      record_uptime_check: {
        Args: {
          p_error?: string | null;
          p_monitor_id: string;
          p_response_ms?: number | null;
          p_status_code?: number | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      audit_frequency: "hourly" | "daily" | "weekly";
      audit_provider: "pagespeed" | "simulated";
      audit_status: "queued" | "running" | "completed" | "failed";
      audit_trigger: "scheduled" | "manual";
      crux_category: "FAST" | "AVERAGE" | "SLOW" | "NONE";
      device_type: "desktop" | "mobile";
      effort_level: "low" | "medium" | "high";
      environment_type: "production" | "staging";
      field_scope: "url" | "origin";
      finding_kind: "opportunity" | "diagnostic";
      issue_category:
        | "performance"
        | "seo"
        | "accessibility"
        | "best-practices"
        | "security";
      issue_severity: "critical" | "high" | "medium" | "low";
      issue_status: "open" | "in_progress" | "resolved" | "ignored";
      uptime_monitor_state: "pending" | "up" | "degraded" | "down" | "paused";
      website_status: "operational" | "degraded" | "down" | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

/** Convenience row aliases used throughout the data layer. */
export type WebsiteRow = Tables<"websites">;
export type AuditRow = Tables<"audits">;
export type IssueRow = Tables<"issues">;
export type ProfileRow = Tables<"profiles">;
export type ReportPreferencesRow = Tables<"report_preferences">;
export type UptimeMonitorRow = Tables<"uptime_monitors">;
export type UptimeDailyRow = Tables<"uptime_daily">;
export type UptimeIncidentRow = Tables<"uptime_incidents">;
