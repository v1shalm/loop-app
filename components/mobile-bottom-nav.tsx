"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  CalendarBlank,
  List,
  MagnifyingGlass,
  Sun,
  Tray,
} from "@/components/icons";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  inboxBadge?: number;
  myWorkBadge?: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
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
  onOpenSearch,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  // Stable layoutId namespace per nav instance — prevents the animated
  // pill from cross-firing if a second nav ever mounts.
  const navId = useId();

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
        icon={Sun}
        label="My Day"
        active={isMyWork}
        badge={myWorkBadge}
        navId={navId}
      />
      <TabLink
        href="/inbox"
        icon={Tray}
        label="Inbox"
        active={isInbox}
        badge={inboxBadge}
        navId={navId}
      />
      <TabButton
        icon={MagnifyingGlass}
        label="Search"
        active={false}
        onClick={onOpenSearch}
        navId={navId}
      />
      <TabLink
        href="/upcoming"
        icon={CalendarBlank}
        label="Upcoming"
        active={isUpcoming}
        navId={navId}
      />
      <TabButton
        icon={List}
        label="Menu"
        active={menuOpen}
        onClick={onOpenMenu}
        navId={navId}
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
  navId,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  navId: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5 pb-2.5 pt-2 text-[10.5px] font-medium transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.94] active:bg-accent/30",
        active ? "text-primary-readable" : "text-muted-foreground"
      )}
    >
      {active && <ActiveTabPill navId={navId} />}
      <TabIcon Icon={Icon} active={active} badge={badge} />
      <span className="relative">{label}</span>
    </Link>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
  navId,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  navId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5 pb-2.5 pt-2 text-[10.5px] font-medium transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.94] active:bg-accent/30",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {active && <ActiveTabPill navId={navId} />}
      <TabIcon Icon={Icon} active={active} />
      <span className="relative">{label}</span>
    </button>
  );
}

/**
 * Animated active-tab indicator. Uses motion's layoutId so the pill
 * slides between tabs when the user navigates instead of snapping.
 * The `relative` parent on each tab clips the pill to that tab's
 * footprint; the pill itself is the absolutely-positioned tinted
 * rectangle behind the icon + label.
 *
 * Respects prefers-reduced-motion via the global CSS handling - motion's
 * transitions degrade to ~0ms automatically when the OS setting is on.
 */
function ActiveTabPill({ navId }: { navId: string }) {
  return (
    <motion.span
      layoutId={`mobile-nav-active-${navId}`}
      aria-hidden
      className="absolute inset-x-2 inset-y-1 -z-0 rounded-lg bg-primary/8"
      transition={{ type: "spring", duration: 0.35, bounce: 0.18 }}
    />
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
  // Tab icon springs up a touch when the tab becomes active. Pairs
  // with the layoutId pill slide so the new tab gets a small "I'm
  // it now" signal beyond just the colour change.
  return (
    <motion.span
      className="relative"
      animate={{ scale: active ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 480, damping: 18 }}
    >
      <Icon size={22} weight={active ? "fill" : "regular"} />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </motion.span>
  );
}
