/**
 * Hand-authored types matching `supabase/migrations/0001_init.sql`.
 * Regenerate from your Supabase project with:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          initials: string;
          avatar_color: string;
          status: "coffee" | "focus" | "done" | "busy" | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          initials: string;
          avatar_color?: string;
          status?: "coffee" | "focus" | "done" | "busy" | null;
          role?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          emoji: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["workspace_members"]["Insert"]
        >;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          emoji: string | null;
          color: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          emoji?: string | null;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          status: "todo" | "doing" | "done";
          priority: number;
          due_at: string | null;
          assignee_id: string | null;
          author_id: string | null;
          triaged_at: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          status?: "todo" | "doing" | "done";
          priority?: number;
          due_at?: string | null;
          assignee_id?: string | null;
          author_id?: string | null;
          triaged_at?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["task_comments"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
