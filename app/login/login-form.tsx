"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { CircleNotch, Tray } from "@/components/icons";
import { GoogleG } from "@/components/google-g-icon";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { sendMagicLink } from "./actions";

// Demo accounts — intentionally public so reviewers can compare what each
// role / team sees. Two teams (Design, Engineering), each with an admin
// and a member, so team isolation + role gating are both demonstrable.
interface DemoAccount {
  email: string;
  password: string;
  name: string;
  team: "Design" | "Engineering";
  role: "Admin" | "Member";
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "alex@loop.app", password: "alex-loop-2026", name: "Alex", team: "Design", role: "Admin" },
  { email: "mia@loop.app", password: "mia-loop-2026", name: "Mia", team: "Design", role: "Member" },
  { email: "ravi@loop.app", password: "ravi-loop-2026", name: "Ravi", team: "Engineering", role: "Admin" },
  { email: "priya@loop.app", password: "priya-loop-2026", name: "Priya", team: "Engineering", role: "Member" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/assigned-to-me";

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [demoSlug, setDemoSlug] = useState<string | null>(null);

  const signInWithDemo = async (account: DemoAccount) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      sileo.error({ title: "Sign-in isn't configured yet." });
      return;
    }
    setDemoSlug(account.email);
    setDemoPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) {
      setDemoPending(false);
      setDemoSlug(null);
      sileo.error({
        title: "Demo account not ready yet.",
        description: error.message,
      });
      return;
    }
    router.push(next);
    router.refresh();
  };

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
          }}
          className="focus-ring mt-4 rounded-md px-3 py-1.5 text-[12.5px] text-primary transition-colors hover:bg-primary/8"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const anyPending = pending || googlePending || demoPending;

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

      {/* Email magic link */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.trim()) return;
          setPending(true);
          setError(null);
          const res = await sendMagicLink(email.trim(), next);
          setPending(false);
          if (res.error) setError(res.error);
          else setSentTo(email.trim());
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
            aria-describedby={error ? "email-error" : undefined}
            disabled={anyPending}
            className="focus-ring h-10 w-full rounded-md border border-border bg-background px-3 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={anyPending || !email.trim()}
          className="focus-ring surface-brand surface-brand-hover mt-1 flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100"
        >
          {pending && <CircleNotch size={14} className="animate-spin" />}
          {pending ? "Sending link…" : "Continue with email"}
        </button>

        {error && (
          <p
            id="email-error"
            role="alert"
            className="rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700"
          >
            {error}
          </p>
        )}

        <p className="mt-1 text-center text-[11.5px] text-muted-foreground">
          We&apos;ll email you a one-tap sign-in link. No password.
        </p>
      </form>

      {/* Demo accounts — one per role per team. Lets reviewers compare
          what each role sees without juggling passwords. */}
      <div className="mt-1 rounded-lg border border-dashed border-border bg-muted/30 p-3">
        <p className="text-center text-[12px] text-muted-foreground">
          Reviewers — sign in as one of these demo accounts to compare roles
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => {
            const isThisPending = demoPending && demoSlug === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => signInWithDemo(acc)}
                disabled={anyPending}
                className="focus-ring group flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-accent/40 disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">
                    {acc.name}
                  </p>
                  <p className="truncate text-[10.5px] text-muted-foreground">
                    {acc.team} · {acc.role}
                  </p>
                </div>
                {isThisPending && (
                  <CircleNotch
                    size={12}
                    className="shrink-0 animate-spin text-muted-foreground"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
