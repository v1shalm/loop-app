"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MemberPulse } from "@/lib/queries";
import { statusEmoji, statusLabel } from "@/components/status-picker";

export function TeamPulse({
  members,
  currentUserId,
  collapsed,
}: {
  members: MemberPulse[];
  currentUserId: string;
  collapsed: boolean;
}) {
  if (members.length === 0) return null;

  // Show others first (more useful to glance at), then self at the end.
  const sorted = [...members].sort((a, b) => {
    if (a.id === currentUserId) return 1;
    if (b.id === currentUserId) return -1;
    return a.name.localeCompare(b.name);
  });

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {sorted.slice(0, 4).map((m) => (
          <PulseRow
            key={m.id}
            member={m}
            isMe={m.id === currentUserId}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {sorted.map((m) => (
        <PulseRow key={m.id} member={m} isMe={m.id === currentUserId} />
      ))}
    </div>
  );
}

function PulseRow({
  member,
  isMe,
  compact,
}: {
  member: MemberPulse;
  isMe: boolean;
  compact?: boolean;
}) {
  const emoji = statusEmoji(member.status ?? null);
  const label = statusLabel(member.status ?? null);

  // The tooltip popup uses bg-foreground (dark) + text-background by default,
  // so inner text needs inverse colors to be readable.
  const summary = (
    <div className="flex min-w-[180px] flex-col gap-1 text-background">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-semibold">
          {member.name}
          {isMe && " (you)"}
        </span>
        {emoji && <span className="text-[13px]">{emoji}</span>}
      </div>
      {label && (
        <span className="text-[11.5px] text-background/70">{label}</span>
      )}
      <div className="mt-1 flex gap-3 text-[11.5px] tabular-nums text-background/70">
        <span>
          <span className="font-semibold text-background">
            {member.open_tasks}
          </span>{" "}
          active
        </span>
        <span>
          <span className="font-semibold text-background">
            {member.completed_today}
          </span>{" "}
          done today
        </span>
      </div>
    </div>
  );

  const avatar = (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-zinc-900"
      style={{
        backgroundColor: member.avatar_color,
        boxShadow: "var(--shadow-avatar)",
      }}
    >
      {member.initials}
    </span>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={`/team/${member.id}`}
              aria-label={member.name}
              className="focus-ring relative grid size-9 place-items-center rounded-md hover:bg-sidebar-accent/40"
            >
              {avatar}
              {emoji && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-sidebar text-[8px] leading-none">
                  {emoji}
                </span>
              )}
            </Link>
          }
        />
        <TooltipContent side="right" sideOffset={8} className="px-3 py-2.5">
          {summary}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={`/team/${member.id}`}
            className={cn(
              "focus-ring group flex h-8 items-center gap-2 rounded-md px-2 text-[13px] transition-colors",
              "text-sidebar-foreground/90 hover:bg-sidebar-accent/40 hover:text-foreground"
            )}
          >
            {avatar}
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
            {emoji && (
              <span
                className="text-[14px] leading-none"
                aria-label={label ?? undefined}
              >
                {emoji}
              </span>
            )}
          </Link>
        }
      />
      <TooltipContent side="right" sideOffset={6} className="p-2">
        {summary}
      </TooltipContent>
    </Tooltip>
  );
}
