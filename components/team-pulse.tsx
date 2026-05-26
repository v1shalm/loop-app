"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MemberPulse } from "@/lib/queries";
import { statusLabel } from "@/components/status-picker";
import { Avatar } from "@/components/avatar";

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
          done
        </span>
      </div>
    </div>
  );

  const avatar = (
    <Avatar
      src={member.avatar_url}
      initials={member.initials}
      color={member.avatar_color}
      size={20}
    />
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={`/team/${member.id}`}
              prefetch={false}
              aria-label={member.name}
              className="focus-ring relative grid size-9 place-items-center rounded-md hover:bg-sidebar-accent/40"
            >
              {avatar}
              {member.open_tasks > 0 && (
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-sidebar"
                />
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

  // Subtext: prefer the user's chosen status label if set, otherwise show
  // the open task count so the row always has signal.
  const subtext =
    label ??
    (member.open_tasks > 0
      ? `${member.open_tasks} open`
      : "Available");

  // Presence dot color — green if they have open work in flight, neutral
  // gray otherwise. We don't have a real presence channel; this maps to
  // observed activity instead.
  const presenceColor =
    member.open_tasks > 0
      ? "bg-emerald-500"
      : "bg-muted-foreground/30";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={`/team/${member.id}`}
            prefetch={false}
            className={cn(
              "focus-ring group flex h-11 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
              "text-sidebar-foreground/90 hover:bg-sidebar-accent/40 hover:text-foreground"
            )}
          >
            <span className="relative">
              {avatar}
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-sidebar",
                  presenceColor
                )}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-foreground">
                {member.name.split(" ")[0]}
                {isMe && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    (you)
                  </span>
                )}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {subtext}
              </span>
            </span>
          </Link>
        }
      />
      <TooltipContent side="right" sideOffset={6} className="p-2">
        {summary}
      </TooltipContent>
    </Tooltip>
  );
}
