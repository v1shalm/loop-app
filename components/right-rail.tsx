import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { CheckCircle, UserPlus } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { statusLabel } from "@/components/status-picker";
import type { ActivityItem, MemberPulse } from "@/lib/queries";

interface RightRailProps {
  completedToday: number;
  activeToday: number;
  members: MemberPulse[];
  currentUserId: string;
  activity: ActivityItem[];
}

/**
 * 300px companion column for list pages — progress ring, team activity,
 * and a small recent-events feed. Server component; data comes from
 * the page above.
 */
export function RightRail({
  completedToday,
  activeToday,
  members,
  currentUserId,
  activity,
}: RightRailProps) {
  return (
    <aside className="hidden flex-col gap-4 lg:flex">
      <ProgressCard completed={completedToday} active={activeToday} />
      <TeamCard members={members} currentUserId={currentUserId} />
      <ActivityCard items={activity} currentUserId={currentUserId} />
    </aside>
  );
}

// ── Today's progress ─────────────────────────────────────────────────────────

function ProgressCard({
  completed,
  active,
}: {
  completed: number;
  active: number;
}) {
  const total = completed + active;
  const ratio = total === 0 ? 0 : completed / total;
  const pct = Math.round(ratio * 100);

  const hint =
    total === 0
      ? "Nothing on your plate yet today."
      : completed === 0
      ? "Pick one and get started."
      : ratio === 1
      ? "Inbox zero — nice."
      : `${active} left to wrap up.`;

  return (
    <CardShell>
      <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Today
      </h3>
      <div className="mt-3 flex items-center gap-4">
        <ProgressRing ratio={ratio} />
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-semibold tabular-nums leading-none text-foreground">
            {completed}
            <span className="text-muted-foreground/70">/{total}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">done</p>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">{hint}</p>
      {total > 0 && (
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground/70">
          {pct}% complete
        </p>
      )}
    </CardShell>
  );
}

function ProgressRing({ ratio }: { ratio: number }) {
  const size = 56;
  const stroke = 5;
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
        stroke="oklch(0.92 0.005 250)"
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

// ── Team is working on… ───────────────────────────────────────────────────────

function TeamCard({
  members,
  currentUserId,
}: {
  members: MemberPulse[];
  currentUserId: string;
}) {
  const others = members
    .filter((m) => m.id !== currentUserId && m.open_tasks > 0)
    .sort((a, b) => b.open_tasks - a.open_tasks)
    .slice(0, 5);

  return (
    <CardShell>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Team is working on
        </h3>
        <Link
          href="/team"
          className="text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          All
        </Link>
      </div>
      {others.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Quiet on the floor right now.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {others.map((m) => {
            const label = statusLabel(m.status ?? null);
            return (
              <li key={m.id}>
                <Link
                  href={`/team/${m.id}`}
                  className="focus-ring flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/40"
                >
                  <Avatar
                    src={m.avatar_url}
                    initials={m.initials}
                    color={m.avatar_color}
                    size={26}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {m.name.split(" ")[0]}
                    </span>
                    {label && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {label}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                    {m.open_tasks} open
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

// ── Recent activity ──────────────────────────────────────────────────────────

function ActivityCard({
  items,
  currentUserId,
}: {
  items: ActivityItem[];
  currentUserId: string;
}) {
  const top = items.slice(0, 5);

  return (
    <CardShell>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent activity
        </h3>
        <Link
          href="/notifications"
          className="text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          All
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Nothing in the last 7 days.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {top.map((item) => (
            <ActivityRow
              key={`${item.kind}-${item.task.id}-${item.at}`}
              item={item}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}
    </CardShell>
  );
}

function ActivityRow({
  item,
  currentUserId,
}: {
  item: ActivityItem;
  currentUserId: string;
}) {
  const { kind, task, at } = item;
  const ago = formatDistanceToNow(new Date(at), { addSuffix: true });

  if (kind === "i-completed") {
    return (
      <li className="flex items-start gap-2">
        <CheckCircle
          size={14}
          weight="fill"
          className="mt-0.5 shrink-0 text-emerald-600"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] text-foreground">
            You completed{" "}
            <span className="font-medium">{task.title}</span>
          </p>
          <p className="text-[11px] text-muted-foreground/80" title={format(new Date(at), "PPp")}>
            {ago}
          </p>
        </div>
      </li>
    );
  }

  const author = task.author;
  return (
    <li className="flex items-start gap-2">
      {author ? (
        <span className="mt-0.5">
          <Avatar
            src={author.avatar_url}
            initials={author.initials}
            color={author.avatar_color}
            size={18}
          />
        </span>
      ) : (
        <UserPlus
          size={14}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-foreground">
          <span className="font-medium">
            {author?.id === currentUserId
              ? "You"
              : author?.name.split(" ")[0] ?? "Someone"}
          </span>{" "}
          assigned you{" "}
          <span className="font-medium">{task.title}</span>
        </p>
        <p className="text-[11px] text-muted-foreground/80" title={format(new Date(at), "PPp")}>
          {ago}
        </p>
      </div>
    </li>
  );
}

// ── Shared shell ─────────────────────────────────────────────────────────────

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft-xs">
      {children}
    </section>
  );
}
