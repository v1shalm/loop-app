"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
  const host = hdrs.get("host");
  // x-forwarded-proto is set by Vercel/proxies; locally we fall back to http
  // when the host is localhost, otherwise assume https.
  const proto =
    hdrs.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin =
    hdrs.get("origin") ||
    (host ? `${proto}://${host}` : "http://localhost:3000");

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
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
