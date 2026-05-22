import Link from "next/link";
import { UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getCurrentProfile, getMembersWithPulse } from "@/lib/queries";
import { statusEmoji, statusLabel } from "@/components/status-picker";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Team · Loop" };

export default async function TeamPage() {
  const [me, members] = await Promise.all([
    getCurrentProfile(),
    getMembersWithPulse(),
  ]);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<UsersThree size={16} />}
        title="Team"
        subtitle={`${members.length} ${
          members.length === 1 ? "teammate" : "teammates"
        }`}
      />

      <div className="mx-auto w-full max-w-[960px] px-8 pb-24 pt-8">
        {members.length === 0 ? (
          <EmptyState
            emoji="👋"
            title="Just you in here for now"
            hint="Invite teammates so you can hand work off. Anyone you assign a task to will see it in their Inbox."
            showAction={false}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                isMe={me?.id === m.id}
              />
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
  const emoji = statusEmoji(member.status ?? null);
  const label = statusLabel(member.status ?? null);

  // Progress ring: ratio of done today over (done + open). Caps at 1.
  const total = member.open_tasks + member.completed_today;
  const ratio = total === 0 ? 0 : member.completed_today / total;

  return (
    <Link
      href={`/team/${member.id}`}
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
          <p className="truncate text-[14.5px] font-semibold text-foreground">
            {member.name}
            {isMe && (
              <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
                (you)
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {emoji ? (
              <>
                <span>{emoji}</span>{" "}
                <span>{label}</span>
              </>
            ) : (
              <span className="text-muted-foreground/60">
                No status set
              </span>
            )}
          </p>
        </div>
        <ProgressRing ratio={ratio} />
      </div>

      <div className="flex items-baseline gap-4 border-t border-border/40 pt-3 text-[12.5px]">
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
          <span className="text-muted-foreground">done today</span>
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
