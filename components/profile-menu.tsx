"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CaretRight,
  Gear,
  SignOut,
  UsersThree,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/queries";
import { signOut } from "@/app/login/actions";

export function ProfileMenu({ user }: { user: Profile }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-ring flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-left shadow-soft-xs transition-colors hover:bg-accent/40 data-[popup-open]:bg-accent/40"
        aria-label="Open account menu"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-zinc-900"
          style={{
            backgroundColor: user.avatar_color,
            boxShadow: "var(--shadow-avatar)",
          }}
        >
          {user.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {user.name}
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {user.role ?? "Team member"}
          </p>
        </div>
        <CaretRight
          size={13}
          weight="bold"
          className="shrink-0 text-muted-foreground/60"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[224px] rounded-lg border border-border/60 bg-popover p-1 shadow-soft-sm ring-0"
      >
        <div className="flex items-center gap-2 px-2 pb-1.5 pt-1.5">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-zinc-900"
            style={{
              backgroundColor: user.avatar_color,
              boxShadow: "var(--shadow-avatar)",
            }}
          >
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.role ?? "Team member"}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-border/60" />

        <DropdownMenuItem
          render={<Link href="/profile" />}
          className="gap-2 px-2 py-1.5 text-[13px]"
        >
          <Gear size={14} className="text-muted-foreground" />
          <span>Profile settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/team" />}
          className="gap-2 px-2 py-1.5 text-[13px]"
        >
          <UsersThree size={14} className="text-muted-foreground" />
          <span>Team</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/notifications" />}
          className="gap-2 px-2 py-1.5 text-[13px]"
        >
          <Bell size={14} className="text-muted-foreground" />
          <span>Notifications</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/60" />

        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className="gap-2 px-2 py-1.5 text-[13px]"
        >
          <SignOut size={14} />
          <span>{pending ? "Logging out…" : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
