"use server";

import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function sendMagicLink(
  email: string,
  next: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return {
      error:
        "Supabase isn't configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ||
    (hdrs.get("host") ? `http://${hdrs.get("host")}` : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServer();
  if (!supabase) return;
  await supabase.auth.signOut();
}
