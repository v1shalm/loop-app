import { redirect } from "next/navigation";
import { CreateTeamForm } from "./create-team-form";
import {
  getCurrentProfile,
  getMyTeam,
} from "@/lib/queries";

export const metadata = { title: "Set up your workspace · Loop" };

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
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-1 duration-500 ease-[var(--ease-out)]">
        <h1 className="text-center text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-foreground">
          Hey {firstName}.
        </h1>
        <p className="mt-2 text-center text-[15px] text-muted-foreground">
          Name your workspace to get started.
        </p>

        <div className="mt-10">
          <CreateTeamForm />
        </div>

        <p className="mx-auto mt-8 text-center text-[12px] text-muted-foreground/80">
          Already in a workspace? Ask an admin to add you.
        </p>
      </div>
    </main>
  );
}
