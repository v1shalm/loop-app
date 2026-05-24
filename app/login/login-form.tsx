"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { CircleNotch, Eye, EyeSlash, Tray } from "@/components/icons";
import { GoogleG } from "@/components/google-g-icon";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { sendMagicLink } from "./actions";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/assigned-to-me";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      sileo.error({ title: "Sign-in isn't configured yet." });
      return;
    }
    setGooglePending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setGooglePending(false);
      sileo.error({ title: error.message });
    }
    // On success the browser is redirected to Google, no further action here.
  };

  const signInWithPassword = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Sign-in isn't configured yet.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setPending(false);
      // Friendlier copy for the most common failure
      setError(
        error.message.toLowerCase().includes("invalid")
          ? "That email and password don't match an account."
          : error.message
      );
      return;
    }
    router.push(next);
    router.refresh();
  };

  const submitMagicLink = async () => {
    setPending(true);
    setError(null);
    const res = await sendMagicLink(email.trim(), next);
    setPending(false);
    if (res.error) setError(res.error);
    else setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/40 px-5 py-6 text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Tray size={18} weight="fill" />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-foreground">
          Check your inbox
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          A magic link is on its way to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>.
        </p>
        <button
          onClick={() => {
            setSentTo(null);
            setEmail("");
            setMode("password");
          }}
          className="focus-ring mt-4 rounded-md px-3 py-1.5 text-[12.5px] text-primary transition-colors hover:bg-primary/8"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const anyPending = pending || googlePending;
  const canSubmit =
    mode === "password"
      ? Boolean(email.trim() && password)
      : Boolean(email.trim());

  return (
    <div className="flex flex-col gap-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={anyPending}
        className="focus-ring chip-3d flex h-10 items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 text-[13.5px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100"
      >
        {googlePending ? (
          <CircleNotch size={14} className="animate-spin text-muted-foreground" />
        ) : (
          <GoogleG size={16} />
        )}
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
          or with email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email + password (primary). Toggles to email-only when the
          user picks magic-link instead. */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit || anyPending) return;
          if (mode === "password") await signInWithPassword();
          else await submitMagicLink();
        }}
        className="flex flex-col gap-3"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12.5px] font-medium text-foreground"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            placeholder="your@workemail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            disabled={anyPending}
            className="focus-ring h-10 w-full rounded-md border border-border bg-background px-3 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50 disabled:opacity-60"
          />
        </div>

        {mode === "password" && (
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[12.5px] font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                disabled={anyPending}
                className="focus-ring h-10 w-full rounded-md border border-border bg-background px-3 pr-10 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="focus-ring absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                {showPw ? <EyeSlash size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={anyPending || !canSubmit}
          className="focus-ring surface-brand surface-brand-hover mt-1 flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100"
        >
          {pending && <CircleNotch size={14} className="animate-spin" />}
          {pending
            ? mode === "password"
              ? "Signing in…"
              : "Sending link…"
            : mode === "password"
              ? "Sign in"
              : "Send magic link"}
        </button>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
          >
            {error}
          </p>
        )}

        {/* Tertiary: swap between password and magic-link. Small text link
            so it doesn't compete with the primary CTA. */}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic" : "password");
            setError(null);
          }}
          disabled={anyPending}
          className="focus-ring mt-0.5 self-center rounded px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          {mode === "password"
            ? "Email me a magic link instead"
            : "Use password instead"}
        </button>
      </form>
    </div>
  );
}
