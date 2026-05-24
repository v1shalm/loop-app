"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDown, Check, Gear, Plus } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Compact workspace identifier used in v2 and v3 sidebars. Tapping the
 * pill opens a small switcher popover with role + workspace settings.
 * Single-workspace today, but the popover surface is the right place
 * to add multi-workspace switching later without re-architecting.
 */
export function WorkspacePill({
  team,
  workspaceName,
  isAdmin,
}: {
  team: { name: string; color?: string | null };
  workspaceName: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "focus-ring group/wp flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-[background-color] duration-150 ease-[var(--ease-out)]",
          open ? "bg-sidebar-accent/60" : "hover:bg-sidebar-accent/40"
        )}
        aria-label="Workspace menu"
      >
        <span className="min-w-0 truncate text-[13.5px] font-semibold tracking-tight text-foreground">
          {team.name}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          className={cn(
            "shrink-0 text-muted-foreground/70 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[256px] p-1.5"
      >
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-md text-[11.5px] font-semibold text-white"
            style={{ backgroundColor: team.color ?? "#94a3b8" }}
          >
            {team.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {team.name}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {workspaceName} · {isAdmin ? "Admin" : "Member"}
            </p>
          </div>
          <Check size={13} weight="bold" className="text-primary" />
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          href="/team"
          onClick={() => setOpen(false)}
          className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-accent/50"
        >
          <Gear size={13} className="text-muted-foreground" />
          Workspace settings
        </Link>
        <Link
          href="/team"
          onClick={() => setOpen(false)}
          className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-accent/50"
        >
          <Plus size={13} className="text-muted-foreground" />
          Invite teammates
        </Link>
      </PopoverContent>
    </Popover>
  );
}
