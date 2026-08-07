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
          best_practices_score: number | null;
          cls: number | null;
          completed_at: string | null;
          created_at: string;
          device: Database["public"]["Enums"]["device_type"];
          duration_ms: number;
          failure_reason: string | null;
          fcp: number | null;
          health_score: number | null;
          id: string;
          inp: number | null;
          issues_found: number;
          lcp: number | null;
          owner_id: string;
          passed_checks: number;
          performance_score: number | null;
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
          best_practices_score?: number | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string;
          device?: Database["public"]["Enums"]["device_type"];
          duration_ms?: number;
          failure_reason?: string | null;
          fcp?: number | null;
          health_score?: number | null;
          id?: string;
          inp?: number | null;
          issues_found?: number;
          lcp?: number | null;
          owner_id: string;
          passed_checks?: number;
          performance_score?: number | null;
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
          best_practices_score?: number | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string;
          device?: Database["public"]["Enums"]["device_type"];
          duration_ms?: number;
          failure_reason?: string | null;
          fcp?: number | null;
          health_score?: number | null;
          id?: string;
          inp?: number | null;
          issues_found?: number;
          lcp?: number | null;
          owner_id?: string;
          passed_checks?: number;
          performance_score?: number | null;
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
          effort: Database["public"]["Enums"]["effort_level"];
          found_at: string;
          id: string;
          owner_id: string;
          recommendation: string;
          rule_id: string;
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
          effort?: Database["public"]["Enums"]["effort_level"];
          found_at?: string;
          id?: string;
          owner_id: string;
          recommendation?: string;
          rule_id: string;
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
          effort?: Database["public"]["Enums"]["effort_level"];
          found_at?: string;
          id?: string;
          owner_id?: string;
          recommendation?: string;
          rule_id?: string;
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
          notify_uptime_incidents: boolean;
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
          notify_uptime_incidents?: boolean;
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
          notify_uptime_incidents?: boolean;
          notify_weekly_digest?: boolean;
          owner_id?: string;
          report_title?: string;
          score_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
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
      [_ in never]: never;
    };
    Enums: {
      audit_frequency: "hourly" | "daily" | "weekly";
      audit_status: "queued" | "running" | "completed" | "failed";
      audit_trigger: "scheduled" | "manual";
      device_type: "desktop" | "mobile";
      effort_level: "low" | "medium" | "high";
      environment_type: "production" | "staging";
      issue_category:
        | "performance"
        | "seo"
        | "accessibility"
        | "best-practices"
        | "security";
      issue_severity: "critical" | "high" | "medium" | "low";
      issue_status: "open" | "in_progress" | "resolved" | "ignored";
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
