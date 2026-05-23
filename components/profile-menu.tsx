"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Desktop,
  Gear,
  Moon,
  Question,
  SignOut,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  UsersThree,
} from "@/components/icons";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/queries";
import { signOut } from "@/app/login/actions";
import { isMuted, setMuted, playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function ProfileMenu({
  user,
  onOpenHelp,
}: {
  user: Profile;
  onOpenHelp?: () => void;
}) {
  const [pending, startTransition] = useTransition();

  // Local mirror of the muted state so the toggle row updates instantly
  // while the menu stays open.
  const [mounted, setMounted] = useState(false);
  const [muted, setLocalMuted] = useState(false);
  useEffect(() => {
    setLocalMuted(isMuted());
    setMounted(true);
  }, []);

  const toggleSounds = () => {
    const next = !muted;
    setLocalMuted(next);
    setMuted(next);
    if (!next) playSound("added");
  };

  const soundsOn = mounted && !muted;

  const { theme, setTheme } = useTheme();
  const THEMES: { key: "light" | "dark" | "system"; Icon: typeof Sun; label: string }[] = [
    { key: "light", Icon: Sun, label: "Light" },
    { key: "dark", Icon: Moon, label: "Dark" },
    { key: "system", Icon: Desktop, label: "System" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group/profile focus-ring flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-left shadow-soft-xs transition-colors hover:bg-accent/40 data-[popup-open]:bg-accent/40"
        aria-label="Open account menu"
      >
        <Avatar
          src={user.avatar_url}
          initials={user.initials}
          color={user.avatar_color}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {user.name}
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {user.role ?? "Team member"}
          </p>
        </div>
        <Gear
          size={14}
          className="shrink-0 text-muted-foreground/60 transition-colors group-hover/profile:text-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[240px] rounded-lg border border-border/60 bg-popover p-1 shadow-soft-sm ring-0"
      >
        <div className="flex items-center gap-2 px-2 pb-1.5 pt-1.5">
          <Avatar
            src={user.avatar_url}
            initials={user.initials}
            color={user.avatar_color}
            size={28}
          />
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

        {/* Theme — three-way segmented control. Persists to localStorage,
            applies the .dark class on <html> for token swapping. */}
        <div className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px]">
          <Sun size={14} className="text-muted-foreground" />
          <span className="flex-1">Theme</span>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
          >
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t.label}
                  onClick={(e) => {
                    e.preventDefault();
                    setTheme(t.key);
                  }}
                  className={cn(
                    "focus-ring grid size-6 place-items-center rounded transition-colors duration-150 ease-[var(--ease-out)]",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <t.Icon size={12} weight={active ? "fill" : "regular"} />
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/60" />

        {/* Sound toggle — plain button so the menu stays open on click. */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSounds();
          }}
          role="menuitemcheckbox"
          aria-checked={soundsOn}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
        >
          {soundsOn ? (
            <SpeakerHigh size={14} className="text-muted-foreground" />
          ) : (
            <SpeakerSlash size={14} className="text-muted-foreground" />
          )}
          <span className="flex-1">Sounds</span>
          <span
            className={cn(
              "text-[11px] font-semibold",
              soundsOn ? "text-primary" : "text-muted-foreground/70"
            )}
          >
            {soundsOn ? "On" : "Off"}
          </span>
        </button>

        {onOpenHelp && (
          <DropdownMenuItem
            onClick={onOpenHelp}
            className="gap-2 px-2 py-1.5 text-[13px]"
          >
            <Question size={14} className="text-muted-foreground" />
            <span className="flex-1">Keyboard shortcuts</span>
            <kbd className="chip-3d inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-card px-1 text-[10.5px] font-semibold text-muted-foreground">
              ?
            </kbd>
          </DropdownMenuItem>
        )}

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
