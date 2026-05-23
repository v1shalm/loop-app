"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RelativeTime } from "@/components/relative-time";
import { CheckCircle, UserPlus } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { statusLabel } from "@/components/status-picker";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import type { ActivityItem, MemberPulse, ProfileStatus } from "@/lib/queries";

interface RightRailProps {
  completedToday: number;
  activeToday: number;
  members: MemberPulse[];
  currentUserId: string;
  activity: ActivityItem[];
}

/**
 * 300px companion column for list pages. One card, three sections,
 * hairline dividers between them — keeps the eye in a single column
 * instead of bouncing between three stacked panels.
 */
export function RightRail({
  completedToday,
  activeToday,
  members,
  currentUserId,
  activity,
}: RightRailProps) {
  return (
    <aside className="hidden lg:block">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
        <TodaySection completed={completedToday} active={activeToday} />
        <Divider />
        <TeamSection members={members} currentUserId={currentUserId} />
        <Divider />
        <ActivitySection items={activity} currentUserId={currentUserId} />
      </div>
    </aside>
  );
}

function Divider() {
  return <div className="h-px bg-border/60" />;
}

function SectionHeader({
  title,
  href,
  linkLabel = "All",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {href && (
        <Link
          href={href}
          className="text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ── Today ────────────────────────────────────────────────────────────────────

function TodaySection({
  completed,
  active,
}: {
  completed: number;
  active: number;
}) {
  const total = completed + active;
  const ratio = total === 0 ? 0 : completed / total;

  const hint =
    total === 0
      ? "Nothing queued today."
      : completed === 0
      ? "Pick one and get started."
      : ratio === 1
      ? "All done for today."
      : `${active} left to wrap up.`;

  return (
    <section className="px-4 py-3.5">
      <SectionHeader title="Today" />
      <div className="mt-2.5 flex items-center gap-3">
        <ProgressRing ratio={ratio} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tabular-nums leading-none text-foreground">
            {completed}
            <span className="text-muted-foreground/70">/{total}</span>
            <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
              complete
            </span>
          </p>
          <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
            {hint}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProgressRing({ ratio }: { ratio: number }) {
  const size = 36;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, ratio));

  // Celebration glow — pulses once when ratio crosses to 1.0. Skipped
  // for users who prefer reduced motion. Skipped on initial mount so
  // landing on a page that's already at 100% doesn't trigger a fake
  // celebration.
  const [celebrate, setCelebrate] = useState(false);
  const lastRatio = useRef<number | null>(null);
  useEffect(() => {
    const prev = lastRatio.current;
    lastRatio.current = ratio;
    if (prev === null) return;
    if (prev < 1 && ratio >= 1) {
      // Audio fires regardless of reduced motion — sound is its own
      // channel and isn't gated by motion preferences. Mute toggle in
      // the profile menu already handles "no sound" cases.
      playSound("streak");
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 900);
      return () => clearTimeout(t);
    }
  }, [ratio]);

  return (
    <span
      className={cn(
        "relative inline-grid place-items-center transition-[filter] duration-300 ease-[var(--ease-out)]",
        celebrate && "drop-shadow-[0_0_8px_var(--color-primary)]"
      )}
    >
      <svg
        width={size}
        height={size}
        className={cn(
          "-rotate-90 shrink-0 transition-transform duration-500 ease-[var(--ease-out)]",
          celebrate && "scale-[1.08]"
        )}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            transition:
              "stroke-dasharray 280ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </svg>
    </span>
  );
}

// ── Team Pulse ───────────────────────────────────────────────────────────────

const PRESENCE: Record<NonNullable<ProfileStatus>, string> = {
  coffee: "bg-amber-500",
  focus: "bg-violet-500",
  done: "bg-muted-foreground/40",
  busy: "bg-rose-500",
};

function presenceColor(status: ProfileStatus, openTasks: number) {
  if (status) return PRESENCE[status];
  return openTasks > 0 ? "bg-emerald-500" : "bg-muted-foreground/30";
}

function memberSubtext(m: MemberPulse) {
  if (m.status === "coffee" || m.status === "busy" || m.status === "done") {
    return statusLabel(m.status) ?? "";
  }
  if (m.current_task_title) {
    return `Working on ${m.current_task_title}`;
  }
  if (m.open_tasks > 0) return `${m.open_tasks} open`;
  return statusLabel(m.status) ?? "Active now";
}

function TeamSection({
  members,
  currentUserId,
}: {
  members: MemberPulse[];
  currentUserId: string;
}) {
  // Others with work first, sorted by load. Cap at 4 to keep the rail compact.
  const others = members
    .filter((m) => m.id !== currentUserId)
    .sort((a, b) => b.open_tasks - a.open_tasks)
    .slice(0, 4);

  return (
    <section className="px-4 py-3.5">
      <SectionHeader title="Team Pulse" href="/team" />
      {others.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Quiet on the floor right now.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {others.map((m) => (
            <li key={m.id}>
              <Link
                href={`/team/${m.id}`}
                className="focus-ring -mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/40"
              >
                <span className="relative shrink-0">
                  <Avatar
                    src={m.avatar_url}
                    initials={m.initials}
                    color={m.avatar_color}
                    size={26}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card",
                      presenceColor(m.status ?? null, m.open_tasks)
                    )}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-medium text-foreground">
                    {m.name.split(" ")[0]}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {memberSubtext(m)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Recent activity ──────────────────────────────────────────────────────────

function ActivitySection({
  items,
  currentUserId,
}: {
  items: ActivityItem[];
  currentUserId: string;
}) {
  const top = items.slice(0, 4);

  return (
    <section className="px-4 py-3.5">
      <SectionHeader title="Recent activity" href="/notifications" />
      {top.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Nothing in the last 7 days.
        </p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {top.map((item) => (
            <ActivityRow
              key={`${item.kind}-${item.task.id}-${item.at}`}
              item={item}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
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

  if (kind === "i-completed") {
    return (
      <li className="flex items-start gap-2">
        <CheckCircle
          size={14}
          weight="fill"
          className="mt-0.5 shrink-0 text-emerald-600"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">You</span>{" "}
            completed{" "}
            <span className="font-medium text-foreground">{task.title}</span>
          </p>
          <RelativeTime
            date={at}
            className="mt-0.5 block text-[11px] text-muted-foreground/70"
          />
        </div>
      </li>
    );
  }

  const author = task.author;
  const name =
    author?.id === currentUserId
      ? "You"
      : author?.name.split(" ")[0] ?? "Someone";

  return (
    <li className="flex items-start gap-2">
      {author ? (
        <span className="mt-0.5 shrink-0">
          <Avatar
            src={author.avatar_url}
            initials={author.initials}
            color={author.avatar_color}
            size={16}
            fontSize={8}
          />
        </span>
      ) : (
        <UserPlus
          size={14}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">{name}</span>{" "}
          assigned you{" "}
          <span className="font-medium text-foreground">{task.title}</span>
        </p>
        <RelativeTime
          date={at}
          className="mt-0.5 block text-[11px] text-muted-foreground/70"
        />
      </div>
    </li>
  );
}
