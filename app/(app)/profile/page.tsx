import { format } from "date-fns";
import { CheckCircle, Crosshair, Tray } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProfileIdentityForm } from "@/components/profile-identity-form";
import { ProfileStatusRow } from "@/components/profile-status-row";
import { MetricStrip } from "@/components/metric-strip";
import {
  getCurrentProfile,
  getMyStats,
  getRecentActivity,
} from "@/lib/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Your profile · Loop" };

async function getAuthEmail(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export default async function ProfilePage() {
  const [profile, stats, activity, authEmail] = await Promise.all([
    getCurrentProfile(),
    getMyStats(),
    getRecentActivity(),
    getAuthEmail(),
  ]);
  if (!profile) redirect("/login");

  const recent = activity.slice(0, 6);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Crosshair size={16} />}
        title="Your profile"
        subtitle="Identity, status, and what you've shipped today"
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        {/* Identity */}
        <section className="mb-8">
          <ProfileIdentityForm
            initialName={profile.name}
            initialRole={profile.role ?? null}
            email={authEmail}
            avatarColor={profile.avatar_color}
            avatarUrl={profile.avatar_url}
            initials={profile.initials}
          />
        </section>

        {/* Inline metric strip — replaces the 3-tile grid. */}
        <section className="mb-8">
          <h3 className="mb-2.5 text-[15px] font-semibold tracking-tight text-foreground">
            Today
          </h3>
          <MetricStrip
            metrics={[
              {
                label: "Done today",
                value: stats.completed_today,
                tone: "emerald",
              },
              {
                label: "Assigned to me",
                value: stats.open_assigned,
              },
              { label: "I created", value: stats.open_authored },
            ]}
          />
        </section>

        {/* Status */}
        <section className="mb-8">
          <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-foreground">
            Status
          </h3>
          <p className="mb-2 text-[12px] text-muted-foreground">
            Tell teammates what you&apos;re up to.
          </p>
          <ProfileStatusRow current={profile.status ?? null} />
        </section>

        {/* Recent activity */}
        <section className="mb-8">
          <header className="mb-2 border-b border-border/50 pb-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
              Recent activity
            </h3>
          </header>
          {recent.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-foreground/70">
              Nothing yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {recent.map((a, i) => (
                <li
                  key={`${a.task.id}-${a.kind}-${i}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted">
                    {a.kind === "i-completed" ? (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        className="text-emerald-600"
                      />
                    ) : (
                      <Tray size={13} className="text-muted-foreground" />
                    )}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {a.kind === "i-completed" ? "You completed " : "Assigned · "}
                    <span className="text-muted-foreground">{a.task.title}</span>
                  </p>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {format(new Date(a.at), "h:mm a")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

