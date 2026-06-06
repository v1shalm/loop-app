"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { DashboardLayout, DashboardWidget } from "./types";
import { normalizeOrders } from "./layout";

interface Row {
  id: string;
  type: string;
  position: number;
  size: "S" | "M" | "L";
  settings: Record<string, unknown> | null;
}

/** Load the current user's dashboard (lock flag + ordered widgets). */
export async function getMyDashboard(): Promise<
  DashboardLayout & { error?: string }
> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { locked: false, widgets: [] };

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { locked: false, widgets: [] };

  const db = supabase as any;
  const [dashRes, rowsRes] = await Promise.all([
    db.from("dashboards").select("locked").eq("user_id", uid).maybeSingle(),
    db
      .from("dashboard_widgets")
      .select("id, type, position, size, settings")
      .eq("user_id", uid)
      .order("position", { ascending: true }),
  ]);

  // Surface a read failure so the UI can show a retry state instead of an
  // indistinguishable "empty board".
  if (rowsRes.error) {
    return { locked: false, widgets: [], error: rowsRes.error.message };
  }

  const widgets = normalizeOrders(
    ((rowsRes.data ?? []) as Row[]).map((r) => ({
      id: r.id,
      type: r.type as DashboardWidget["type"],
      order: r.position,
      size: r.size,
      settings: r.settings ?? {},
    }))
  );

  return { locked: (dashRes.data?.locked as boolean) ?? false, widgets };
}

export async function saveDashboardLayout(
  widgets: DashboardWidget[]
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "Not signed in." };

  const db = supabase as any;

  // Upsert first so a failed write never empties the board; then prune any
  // rows the user removed. If the prune fails, the worst case is harmless
  // stale rows that self-heal on the next save — never a blank canvas.
  if (widgets.length > 0) {
    const up = await db.from("dashboard_widgets").upsert(
      widgets.map((w) => ({
        id: w.id,
        user_id: uid,
        type: w.type,
        position: w.order,
        size: w.size,
        settings: w.settings,
      })),
      { onConflict: "id" }
    );
    if (up.error) return { error: up.error.message };

    const keep = widgets.map((w) => w.id).join(",");
    const prune = await db
      .from("dashboard_widgets")
      .delete()
      .eq("user_id", uid)
      .not("id", "in", `(${keep})`);
    if (prune.error) return { error: prune.error.message };
  } else {
    const del = await db.from("dashboard_widgets").delete().eq("user_id", uid);
    if (del.error) return { error: del.error.message };
  }

  revalidatePath("/", "layout");
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

  const db = supabase as any;
  const { error } = await db
    .from("dashboards")
    .upsert({ user_id: uid, locked }, { onConflict: "user_id" });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
