import { format } from "date-fns";
import { CheckCircle, TrendUp, Tray, Crosshair } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProfileIdentityForm } from "@/components/profile-identity-form";
import { ProfileStatusRow } from "@/components/profile-status-row";
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

        {/* Today's stats */}
        <section className="mb-8">
          <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-foreground">
            Today
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={<CheckCircle size={18} weight="fill" />}
              tone="emerald"
              label="Completed today"
              value={stats.completed_today}
            />
            <StatTile
              icon={<Crosshair size={18} />}
              label="Open assigned to me"
              value={stats.open_assigned}
            />
            <StatTile
              icon={<TrendUp size={18} />}
              label="I created"
              value={stats.open_authored}
            />
          </div>
        </section>

        {/* Status */}
        <section className="mb-8">
          <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-foreground">
            Status
          </h3>
          <p className="mb-2 text-[12.5px] text-muted-foreground">
            Tell teammates what you&apos;re up to.
          </p>
          <ProfileStatusRow current={profile.status ?? null} />
        </section>

        {/* Recent activity */}
        <section className="mb-8">
          <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
              Recent activity
            </h3>
            <a
              href="/notifications"
              className="focus-ring text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              See all
            </a>
          </header>
          {recent.length === 0 ? (
            <p className="px-3 py-3 text-[12.5px] text-muted-foreground/70">
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
                  <span className="text-[11.5px] tabular-nums text-muted-foreground/70">
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

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft-xs">
      <div
        className={`mb-2 grid size-8 place-items-center rounded-lg ${
          tone === "emerald"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="text-[24px] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}
