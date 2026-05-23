import { redirect } from "next/navigation";
import { CreateTeamForm } from "./create-team-form";
import {
  getCurrentProfile,
  getMyTeam,
} from "@/lib/queries";

export const metadata = { title: "Set up your team · Loop" };

/**
 * First-run landing for users who signed in but haven't joined a team
 * yet. Models the Linear/Notion/Slack convention: whoever creates the
 * team is its admin; subsequent members arrive via invite with a role
 * the inviter set. The user never picks their own role.
 *
 * Already-on-a-team users get bounced to /assigned-to-me so a stale
 * bookmark to /onboarding doesn't strand them on a dead screen.
 */
export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const team = await getMyTeam();
  if (team) redirect("/assigned-to-me");

  const firstName = profile.name.split(/\s+/)[0];

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-[460px]">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
          Welcome to Loop
        </p>
        <h1 className="mt-3 text-center text-[28px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
          Hi {firstName}. Let&apos;s start with your team.
        </h1>
        <p className="mx-auto mt-2.5 max-w-[400px] text-center text-[14px] leading-relaxed text-muted-foreground">
          Loop scopes work to a team. Create one now and you&apos;ll be
          its admin. You can invite teammates later from the team page.
        </p>

        <div className="mt-7">
          <CreateTeamForm />
        </div>

        <p className="mx-auto mt-6 max-w-[360px] text-center text-[12px] leading-relaxed text-muted-foreground/80">
          Already have a team in Loop? Ask one of its admins to add you
          and refresh this page.
        </p>
      </div>
    </main>
  );
}
