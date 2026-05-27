"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { CircleNotch } from "@/components/icons";
import { acceptInvite } from "@/lib/actions";

/**
 * Client island that owns the Accept button + its pending state. The
 * parent server component owns everything before this — invitation
 * lookup, status branching, mismatched-email guard — so this component
 * is only ever rendered when the invitee is actually eligible to join.
 */
export function AcceptInviteCTA({
  token,
  teamName,
}: {
  token: string;
  teamName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = () =>
    startTransition(async () => {
      setError(null);
      const res = await acceptInvite(token);
      if (res.error) {
        setError(res.error);
        return;
      }
      sileo.success({ title: `Joined ${teamName}` });
      router.push("/assigned-to-me");
      router.refresh();
    });

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="focus-ring surface-brand surface-brand-hover flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100"
      >
        {pending && <CircleNotch size={14} className="animate-spin" />}
        {pending ? "Joining…" : `Join ${teamName}`}
      </button>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
