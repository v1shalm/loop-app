import Link from "next/link";
import { Gear, UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  getCurrentProfile,
  getMembersWithPulse,
  getMyTeamRole,
} from "@/lib/queries";
import { statusLabel } from "@/components/status-picker";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Members · Loop" };

export default async function TeamPage() {
  const [me, members, role] = await Promise.all([
    getCurrentProfile(),
    getMembersWithPulse(),
    getMyTeamRole(),
  ]);

  return (
    <div className="min-h-full">
      <PageHeader icon={<UsersThree size={16} />} title="Members" />

      <div className="mx-auto w-full max-w-[960px] px-8 pb-24 pt-8">
        {role === "admin" && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/8 px-4 py-3">
            <p className="text-[12px] text-primary-readable">
              You&apos;re an admin. Add or remove members, change roles.
            </p>
            <Link
              href="/workspace/manage"
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-card px-2.5 py-1.5 text-[12px] font-medium text-primary-readable transition-colors hover:bg-primary/10"
            >
              <Gear size={13} />
              Manage workspace
            </Link>
          </div>
        )}

        {members.length === 0 ? (
          <EmptyState
            tone="accent"
            icon={<UsersThree size={20} weight="bold" />}
            title="Just you for now"
            hint="Invite teammates to assign work. They'll see anything you assign in their Inbox."
            showAction={false}
          />
        ) : (
          // Sort by department first (people without a department label
          // bubble to the end), then alphabetically — adjacent cards
          // visually group by department without needing real sections.
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...members]
              .sort((a, b) => {
                const da = a.department || "￿";
                const db = b.department || "￿";
                return da.localeCompare(db) || a.name.localeCompare(b.name);
              })
              .map((m) => (
                <MemberCard key={m.id} member={m} isMe={me?.id === m.id} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberCard({
  member,
  isMe,
}: {
  member: import("@/lib/queries").MemberPulse;
  isMe: boolean;
}) {
  const label = statusLabel(member.status ?? null);

  // Progress ring: ratio of done today over (done + open). Caps at 1.
  const total = member.open_tasks + member.completed_today;
  const ratio = total === 0 ? 0 : member.completed_today / total;

  return (
    <Link
      href={`/workspace/${member.id}`}
      className="focus-ring group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={member.avatar_url}
          initials={member.initials}
          color={member.avatar_color}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {member.name}
            {isMe && (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                (you)
              </span>
            )}
          </p>
          {member.department && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground/80">
              {member.department}
            </p>
          )}
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {label ? (
              <span>{label}</span>
            ) : (
              <span className="text-muted-foreground/60">
                No status set
              </span>
            )}
          </p>
        </div>
        <ProgressRing ratio={ratio} />
      </div>

      <div className="flex items-baseline gap-4 border-t border-border/40 pt-3 text-[12px]">
        <span>
          <span className="text-[15px] font-semibold tabular-nums text-foreground">
            {member.open_tasks}
          </span>{" "}
          <span className="text-muted-foreground">active</span>
        </span>
        <span>
          <span className="text-[15px] font-semibold tabular-nums text-foreground">
            {member.completed_today}
          </span>{" "}
          <span className="text-muted-foreground">done</span>
        </span>
      </div>
    </Link>
  );
}

function ProgressRing({ ratio }: { ratio: number }) {
  const size = 32;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, ratio));

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90 shrink-0"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="oklch(0.92 0.007 75)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--primary)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
  );
}
