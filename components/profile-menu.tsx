"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { sileo } from "sileo";
import {
  Bell,
  BellSlash,
  Desktop,
  Gear,
  MoonStars,
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
import { setMyStatus } from "@/lib/actions";
import { isMuted, setMuted, playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_PAUSED_KEY = "loop:notifications-paused";

export function ProfileMenu({
  user,
  onOpenHelp,
  showPresence,
  progressToday,
}: {
  user: Profile;
  onOpenHelp?: () => void;
  showPresence?: boolean;
  /** Optional today's progress for the menu header — when set, replaces
   *  the plain name+role card with a Todoist-style "X / Y today" ring. */
  progressToday?: { done: number; total: number };
}) {
  const [pending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

  // Local mirror of the muted state so the toggle row updates instantly
  // while the menu stays open.
  const [mounted, setMounted] = useState(false);
  const [muted, setLocalMuted] = useState(false);
  const [paused, setLocalPaused] = useState(false);
  useEffect(() => {
    setLocalMuted(isMuted());
    setLocalPaused(
      typeof window !== "undefined" &&
        window.localStorage.getItem(NOTIFICATIONS_PAUSED_KEY) === "1"
    );
    setMounted(true);
  }, []);

  const toggleSounds = () => {
    const next = !muted;
    setLocalMuted(next);
    setMuted(next);
    if (!next) playSound("added");
  };

  // Notifications pause is client-only for now — persists to localStorage
  // so it survives reloads without an extra round-trip to Supabase. Wire
  // it into the realtime bridge later to actually mute toast popovers.
  const toggleNotificationsPaused = () => {
    const next = !paused;
    setLocalPaused(next);
    window.localStorage.setItem(NOTIFICATIONS_PAUSED_KEY, next ? "1" : "0");
  };

  // "Away" maps to the existing `busy` status (the closest equivalent
  // in the schema — see lib/queries.ts ProfileStatus). Calling with
  // `null` clears it.
  const isAway = user.status === "busy";
  const toggleAway = () => {
    if (statusPending) return;
    const next = isAway ? null : "busy";
    startStatusTransition(async () => {
      const res = await setMyStatus(next);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const soundsOn = mounted && !muted;
  const notificationsPaused = mounted && paused;

  const { theme, setTheme } = useTheme();
  const THEMES: { key: "light" | "dark" | "system"; label: string; Icon: typeof Sun }[] = [
    { key: "light", label: "Light", Icon: Sun },
    { key: "dark", label: "Dark", Icon: MoonStars },
    { key: "system", label: "System", Icon: Desktop },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group/profile focus-ring flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-left shadow-soft-xs transition-colors hover:bg-accent/40 data-[popup-open]:bg-accent/40"
        aria-label="Open account menu"
      >
        <span className="relative shrink-0">
          <Avatar
            src={user.avatar_url}
            initials={user.initials}
            color={user.avatar_color}
            size={36}
          />
          {showPresence && (
            <span
              aria-hidden
              className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
            />
          )}
        </span>
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
        className="w-[268px] rounded-xl border border-border/60 bg-popover p-1.5 shadow-soft-sm ring-0"
      >
        {/* Header: avatar (or progress ring), name, role / today's progress */}
        <div className="flex items-center gap-2.5 px-2 pb-2 pt-1">
          {progressToday ? (
            <ProgressRing
              done={progressToday.done}
              total={progressToday.total}
            />
          ) : (
            <Avatar
              src={user.avatar_url}
              initials={user.initials}
              color={user.avatar_color}
              size={28}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {progressToday
                ? `${progressToday.done}/${progressToday.total} tasks today`
                : user.role ?? "Team member"}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        {/* Presence + notifications — top-level toggles inspired by the
            Slack profile menu the user referenced. Each one is its own
            button so the menu stays open on click. */}
        <MenuRow
          icon={MoonStars}
          onClick={toggleAway}
          aria-pressed={isAway}
          disabled={statusPending}
        >
          {isAway ? (
            <>
              You&rsquo;re <strong className="font-semibold">away</strong>
            </>
          ) : (
            <>
              Set yourself as <strong className="font-semibold">away</strong>
            </>
          )}
        </MenuRow>

        <MenuRow
          icon={notificationsPaused ? BellSlash : Bell}
          onClick={toggleNotificationsPaused}
          aria-pressed={notificationsPaused}
        >
          {notificationsPaused ? "Notifications paused" : "Pause notifications"}
        </MenuRow>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        {/* Secondary links */}
        {onOpenHelp && (
          <DropdownMenuItem
            onClick={onOpenHelp}
            className="gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
          >
            <Question size={15} className="text-muted-foreground" />
            <span className="flex-1">Help</span>
            <kbd className="chip-3d inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-card px-1 text-[10.5px] font-semibold text-muted-foreground">
              ?
            </kbd>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          render={<Link href="/profile" />}
          className="gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
        >
          <Gear size={15} className="text-muted-foreground" />
          <span className="flex-1">Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/team" />}
          className="gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
        >
          <UsersThree size={15} className="text-muted-foreground" />
          <span className="flex-1">Team</span>
        </DropdownMenuItem>

        {/* Sound toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSounds();
          }}
          role="menuitemcheckbox"
          aria-checked={soundsOn}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
        >
          {soundsOn ? (
            <SpeakerHigh size={15} className="text-muted-foreground" />
          ) : (
            <SpeakerSlash size={15} className="text-muted-foreground" />
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

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        {/* Theme segmented control — text-first, three options, the
            active one lit on the brand color. Slack-style. */}
        <div
          role="radiogroup"
          aria-label="Theme"
          className="m-1 grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/40 p-1"
        >
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={(e) => {
                  e.preventDefault();
                  setTheme(t.key);
                }}
                className={cn(
                  "focus-ring flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-medium transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                  active
                    ? "surface-active text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.Icon size={12} weight={active ? "fill" : "regular"} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className="gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
        >
          <SignOut size={15} />
          <span>{pending ? "Logging out…" : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One-line button used for the toggleable rows at the top of the menu
 * (Set yourself as away, Pause notifications). Stays open on click —
 * the menu shouldn't dismiss when the row's purpose is to flip state.
 * Pressed state carries forward via aria-pressed for AT users.
 */
function MenuRow({
  icon: Icon,
  onClick,
  children,
  disabled,
  ...aria
}: {
  icon: React.ElementType;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      aria-pressed={aria["aria-pressed"]}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors",
        "hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <Icon
        size={15}
        weight={aria["aria-pressed"] ? "fill" : "regular"}
        className={cn(
          "shrink-0",
          aria["aria-pressed"] ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="flex-1">{children}</span>
    </button>
  );
}

/**
 * Small SVG ring with the completed-today fraction.
 *
 * Sized to the same 28px footprint as the avatar so the menu header
 * doesn't reflow when the prop is/isn't passed. We use stroke
 * pathLength=100 so the dasharray reads like a percentage and the
 * math stays obvious.
 */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const safe = Math.round(pct * 100);
  return (
    <div className="relative grid size-7 shrink-0 place-items-center">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="2.5"
        />
        <circle
          cx="14"
          cy="14"
          r="11"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${safe} 100`}
          transform="rotate(-90 14 14)"
          style={{
            transition: "stroke-dasharray 240ms cubic-bezier(0.23,1,0.32,1)",
          }}
        />
      </svg>
      <span className="absolute text-[9.5px] font-semibold tabular-nums text-foreground">
        {done}
      </span>
    </div>
  );
}
