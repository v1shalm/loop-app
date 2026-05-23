"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDots,
  Crosshair,
  List,
  Tray,
} from "@/components/icons";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  inboxBadge?: number;
  myWorkBadge?: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
}

/**
 * Mobile-only bottom tab bar. Four tabs: My work, Inbox, Upcoming, Menu.
 *
 * Hidden on md+ via `md:hidden`; never participates in the desktop layout.
 * Anchored to the bottom with `env(safe-area-inset-bottom)` padding so the
 * tap targets sit above the iOS home-indicator instead of behind it.
 */
export function MobileBottomNav({
  inboxBadge,
  myWorkBadge,
  menuOpen,
  onOpenMenu,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isMyWork =
    !menuOpen &&
    (pathname === "/assigned-to-me" ||
      pathname === "/my-tasks" ||
      pathname === "/today");
  const isInbox = !menuOpen && pathname === "/inbox";
  const isUpcoming = !menuOpen && pathname === "/upcoming";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border/60 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <TabLink
        href="/assigned-to-me"
        icon={Crosshair}
        label="My work"
        active={isMyWork}
        badge={myWorkBadge}
      />
      <TabLink
        href="/inbox"
        icon={Tray}
        label="Inbox"
        active={isInbox}
        badge={inboxBadge}
      />
      <TabLink
        href="/upcoming"
        icon={CalendarDots}
        label="Upcoming"
        active={isUpcoming}
      />
      <TabButton
        icon={List}
        label="Menu"
        active={menuOpen}
        onClick={onOpenMenu}
      />
    </nav>
  );
}

function TabLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 pb-2.5 pt-2 text-[10.5px] font-medium transition-colors active:bg-accent/30",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <TabIcon Icon={Icon} active={active} badge={badge} />
      <span>{label}</span>
    </Link>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 pb-2.5 pt-2 text-[10.5px] font-medium transition-colors active:bg-accent/30",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <TabIcon Icon={Icon} active={active} />
      <span>{label}</span>
    </button>
  );
}

function TabIcon({
  Icon,
  active,
  badge,
}: {
  Icon: React.ElementType;
  active: boolean;
  badge?: number;
}) {
  return (
    <span className="relative">
      <Icon size={22} weight={active ? "fill" : "regular"} />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </span>
  );
}
