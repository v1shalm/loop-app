"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { DashboardLayout, DashboardWidget } from "./types";

interface Row {
  id: string;
  type: string;
  position: number;
  size: "S" | "M" | "L";
  settings: Record<string, unknown> | null;
}

/** Load the current user's dashboard (lock flag + ordered widgets). */
export async function getMyDashboard(): Promise<DashboardLayout> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { locked: false, widgets: [] };

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { locked: false, widgets: [] };

  const db = supabase as any;
  const [{ data: dash }, { data: rows }] = await Promise.all([
    db.from("dashboards").select("locked").eq("user_id", uid).maybeSingle(),
    db
      .from("dashboard_widgets")
      .select("id, type, position, size, settings")
      .eq("user_id", uid)
      .order("position", { ascending: true }),
  ]);

  const widgets: DashboardWidget[] = ((rows ?? []) as Row[]).map((r) => ({
    id: r.id,
    type: r.type as DashboardWidget["type"],
    order: r.position,
    size: r.size,
    settings: r.settings ?? {},
  }));

  return { locked: (dash?.locked as boolean) ?? false, widgets };
}

/**
 * Replace the user's widget set with `widgets` (full-set save on edit).
 * Delete-all then insert: simple and race-free for a per-user board.
 */
export async function saveDashboardLayout(
  widgets: DashboardWidget[]
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "Not signed in." };

  const db = supabase as any;
  const del = await db.from("dashboard_widgets").delete().eq("user_id", uid);
  if (del.error) return { error: del.error.message };

  if (widgets.length > 0) {
    const ins = await db.from("dashboard_widgets").insert(
      widgets.map((w) => ({
        id: w.id,
        user_id: uid,
        type: w.type,
        position: w.order,
        size: w.size,
        settings: w.settings,
      }))
    );
    if (ins.error) return { error: ins.error.message };
  }

  revalidatePath("/home");
  return { ok: true };
}

/** Set the per-user lock flag (upsert the dashboards row). */
export async function setDashboardLocked(
  locked: boolean
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "Not signed in." };

  const { error } = await (supabase as any)
    .from("dashboards")
    .upsert({ user_id: uid, locked }, { onConflict: "user_id" });
  if (error) return { error: error.message };

  revalidatePath("/home");
  return { ok: true };
}
