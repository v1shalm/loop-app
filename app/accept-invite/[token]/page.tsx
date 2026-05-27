import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { AcceptInviteCTA } from "./accept-invite-cta";

export const metadata = { title: "Join team · Loop" };

interface InvitationLookup {
  id: string;
  team_id: string;
  team_name: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  invited_by_name: string | null;
}

/**
 * Landing page for the share-link an admin sent. The page renders in
 * three branches:
 *   1. Token invalid / revoked / expired / already-accepted — friendly
 *      explanation, no form.
 *   2. Token valid + user signed out — link to /login?next=this-url so
 *      they sign in (Google OAuth or magic link), then bounce back here.
 *   3. Token valid + user signed in — show team + role + Accept button.
 *      If the signed-in email doesn't match the invitation email, we
 *      surface that before they click (the RPC also enforces it
 *      server-side as a defense-in-depth check).
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return <Shell title="Supabase isn’t configured." />;
  }

  // lookup_invitation_by_token isn't in the generated database.types
  // (RPCs there are limited to the pre-existing helpers). Cast supabase
  // to any to bypass the union check — same pattern as elsewhere.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any).rpc(
    "lookup_invitation_by_token",
    { t: token }
  );
  const invite = (Array.isArray(rows) ? rows[0] : null) as
    | InvitationLookup
    | null;

  if (!invite) {
    return (
      <Shell
        title="This invite link isn’t valid."
        body="It may have been cancelled or the URL got mangled. Ask your admin for a fresh link."
      />
    );
  }

  if (invite.status === "accepted") {
    // The recipient has already joined — send them straight into the app
    // so the link isn't a dead end if they bookmark it.
    redirect("/assigned-to-me");
  }

  if (invite.status === "revoked") {
    return (
      <Shell
        title="This invite was cancelled."
        body="Ask the team admin to send a new one."
      />
    );
  }

  if (invite.status === "expired") {
    return (
      <Shell
        title="This invite has expired."
        body="Invites are good for 14 days. Ask the team admin to send a new one."
      />
    );
  }

  const profile = await getCurrentProfile();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: authData } = await (supabase.auth.getUser() as any);
  const currentEmail: string | null =
    authData?.user?.email?.toLowerCase() ?? null;

  if (!profile) {
    return (
      <Shell title={`Join ${invite.team_name} on Loop`}>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {invite.invited_by_name ? (
            <>
              <span className="text-foreground">{invite.invited_by_name}</span>{" "}
              invited{" "}
            </>
          ) : (
            <>You were invited to join </>
          )}
          as <span className="font-medium text-foreground">
            {invite.role === "admin" ? "an admin" : "a member"}
          </span>
          . Sign in with{" "}
          <span className="font-medium text-foreground">{invite.email}</span> to
          accept.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`}
          className="focus-ring surface-brand surface-brand-hover mt-6 flex h-10 items-center justify-center rounded-md px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
        >
          Sign in to accept
        </Link>
      </Shell>
    );
  }

  const emailMismatch =
    currentEmail !== null && currentEmail !== invite.email.toLowerCase();

  return (
    <Shell title={`Join ${invite.team_name} on Loop`}>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {invite.invited_by_name ? (
          <>
            <span className="text-foreground">{invite.invited_by_name}</span>{" "}
            invited{" "}
          </>
        ) : (
          <>You were invited to join </>
        )}
        as{" "}
        <span className="font-medium text-foreground">
          {invite.role === "admin" ? "an admin" : "a member"}
        </span>
        . This invite was sent to{" "}
        <span className="font-medium text-foreground">{invite.email}</span>.
      </p>

      {emailMismatch ? (
        <div className="mt-6 rounded-md border border-rose-200/70 bg-rose-50 px-3 py-3 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
          You&apos;re signed in as{" "}
          <span className="font-medium">{currentEmail}</span>, but this invite
          was sent to <span className="font-medium">{invite.email}</span>. Sign
          out and back in with that email to accept.
          <div className="mt-3">
            <Link
              href={`/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`}
              className="focus-ring inline-flex h-8 items-center rounded-md border border-rose-300/70 bg-white px-3 text-[12px] font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/25"
            >
              Sign in as someone else
            </Link>
          </div>
        </div>
      ) : (
        <AcceptInviteCTA token={token} teamName={invite.team_name} />
      )}
    </Shell>
  );
}

function Shell({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-10">
      <div className="w-full max-w-[420px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft-sm">
          <div className="px-7 pb-7 pt-8">
            <p className="text-center text-[14px] font-semibold tracking-tight text-foreground">
              Loop
            </p>
            <h1 className="mt-6 text-[20px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
              {title}
            </h1>
            {body && (
              <p className="mt-2 text-[13px] text-muted-foreground">{body}</p>
            )}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
