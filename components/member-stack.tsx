"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useAvatarGroupHover } from "@/lib/use-avatar-group-hover";

interface Person {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
  avatar_url?: string | null;
}

/**
 * Overlapping stack of 22px avatar circles. Shows up to `max` members,
 * collapses the rest into a "+N" chip on the right. Each avatar links
 * to the teammate profile so the stack doubles as a navigation
 * affordance, not just decoration.
 */
export function MemberStack({
  members,
  max = 4,
  size = 22,
}: {
  members: Person[];
  max?: number;
  size?: number;
}) {
  const { rootRef, onItemEnter, onLeave } = useAvatarGroupHover();

  if (members.length === 0) return null;
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div
      ref={rootRef}
      onMouseLeave={onLeave}
      className="flex items-center -space-x-[5px]"
    >
      {visible.map((m, i) => (
        <Link
          key={m.id}
          href={`/workspace/${m.id}`}
          prefetch={false}
          aria-label={m.name}
          title={m.name}
          onMouseEnter={() => onItemEnter(i)}
          className="t-avatar focus-ring relative grid shrink-0 place-items-center rounded-full ring-2 ring-background hover:z-10"
          style={{ zIndex: visible.length }}
        >
          <Avatar
            src={m.avatar_url}
            initials={m.initials}
            color={m.avatar_color}
            size={size}
          />
        </Link>
      ))}
      {overflow > 0 && (
        <span
          aria-label={`${overflow} more`}
          className="relative grid shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground ring-2 ring-background"
          style={{ width: size, height: size }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
