"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "motion/react";
import { SidebarV2, type SidebarProps } from "@/components/sidebar-v2";
import { SidebarProvider } from "@/components/sidebar-context";
import { NotificationsProvider } from "@/components/notifications-context";
import { NotificationsDrawer } from "@/components/notifications-drawer";
import { TeamProvider } from "@/components/team-provider";
import {
  QuickAddProvider,
  type QuickAddDefaults,
} from "@/components/quick-add-context";
import { InviteProvider } from "@/components/invite-context";
import { OptimisticDeletesProvider } from "@/components/optimistic-deletes";
import { AppControlsProvider } from "@/components/app-controls-context";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileMenuSheet } from "@/components/mobile-menu-sheet";
import { BottomAddTaskBar } from "@/components/bottom-add-task-bar";

// Heavy client modules — only ship their code once the user actually triggers
// them. Each carries motion + popovers + date-picker code that would
// otherwise inflate the initial app bundle.
const QuickAddDialog = dynamic(
  () => import("@/components/quick-add-dialog").then((m) => m.QuickAddDialog),
  { ssr: false }
);
const TaskDrawer = dynamic(
  () => import("@/components/task-drawer").then((m) => m.TaskDrawer),
  { ssr: false }
);
const SearchPalette = dynamic(
  () => import("@/components/search-palette").then((m) => m.SearchPalette),
  { ssr: false }
);
const InviteTeammateDialog = dynamic(
  () =>
    import("@/components/invite-teammate-dialog").then(
      (m) => m.InviteTeammateDialog
    ),
  { ssr: false }
);
const RealtimeBridge = dynamic(
  () => import("@/components/realtime-bridge").then((m) => m.RealtimeBridge),
  { ssr: false }
);

export function AppShell({
  user,
  workspace,
  team,
  teams,
  teamRole,
  projects,
  members,
  counts,
  children,
}: Omit<SidebarProps, "onOpenQuickAdd"> & { children: React.ReactNode }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaults, setQuickDefaults] = useState<QuickAddDefaults>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prefetch the heavy modal chunks once the shell has painted so the
  // first time the user opens one (task row click → drawer, FAB → quick
  // add, Cmd+K → search), the chunk is already in cache and there's
  // zero JS-download delay on top of the slide-in. Each chunk is ~30kb
  // gzipped; downloading them after first paint costs nothing the user
  // perceives. requestIdleCallback waits for an actual idle moment;
  // setTimeout fallback for Safari and other browsers without it.
  useEffect(() => {
    const prefetch = () => {
      void import("@/components/task-drawer");
      void import("@/components/quick-add-dialog");
      void import("@/components/search-palette");
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(prefetch);
    } else {
      const t = setTimeout(prefetch, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // Global keyboard shortcuts, native-app style: ⌘K / Ctrl+K opens
  // search; a bare Q opens quick-add. The onboarding task tells new
  // users "Hit Q anywhere to open Add task" and several comments promise
  // ⌘K — this is what makes good on both. Q is ignored while typing in a
  // field (or with any modifier) so it never hijacks real input.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      if (node.isContentEditable) return true;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (
        (e.key === "q" || e.key === "Q") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        setQuickDefaults(undefined);
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    // reducedMotion="user" makes every motion.* component in the tree
    // respect the OS prefers-reduced-motion setting: drawer slide-up,
    // task-row drag, swipe gestures, and the bottom-nav active pill
    // all degrade to ~instant transitions when the user has the
    // setting on. Without this they animate the same on every device.
    <MotionConfig reducedMotion="user">
    <SidebarProvider>
      <NotificationsProvider currentUserId={user.id}>
      <TeamProvider
        members={members}
        projects={projects}
        currentUserId={user.id}
      >
        <QuickAddProvider
          open={(defaults) => {
            // Several callers wire `open` straight to an onClick, so the
            // arg can be a MouseEvent. Only accept the real seed shapes.
            const seed: QuickAddDefaults = {};
            if (defaults?.dueAt instanceof Date) seed.dueAt = defaults.dueAt;
            if (typeof defaults?.projectId === "string")
              seed.projectId = defaults.projectId;
            setQuickDefaults(Object.keys(seed).length ? seed : undefined);
            setQuickOpen(true);
          }}
        >
          <InviteProvider open={() => setInviteOpen(true)}>
          <OptimisticDeletesProvider>
          <AppControlsProvider
            value={{
              openSearch: () => setSearchOpen(true),
              currentUserId: user.id,
              inboxCount: counts.inbox,
            }}
          >
          <div className="flex h-dvh w-full overflow-hidden bg-background">
            {/* Desktop sidebar — `contents` keeps it as a direct flex child
                so the desktop layout is byte-for-byte unchanged. On mobile
                the whole branch collapses out of the tree. SidebarV2 owns
                both the expanded (248px) and the collapsed (64px rail)
                presentations, switching internally on the context flag. */}
            <div className="contents max-md:hidden">
              <SidebarV2
                user={user}
                workspace={workspace}
                team={team}
                teams={teams}
                teamRole={teamRole}
                projects={projects}
                members={members}
                counts={counts}
                onOpenSearch={() => setSearchOpen(true)}
              />
            </div>
            <main className="flex-1 overflow-y-auto max-md:pb-[calc(env(safe-area-inset-bottom,0px)+64px)] md:pb-28">
              {children}
            </main>

            {/* Notifications drawer — third flex column on desktop.
                Width animates 0 → 340px via --notif-w when the bell
                toggles open, naturally pushing the main canvas. On
                mobile the component returns null and the bell renders
                a MobileSheet from the topbar instead. */}
            <NotificationsDrawer />

            {/* Mobile shell — every piece is itself `md:hidden`, so on
                desktop the DOM still renders these elements but they have
                `display: none`. No desktop layout impact. */}
            <MobileBottomNav
              myWorkBadge={counts.today || undefined}
              inboxBadge={counts.inbox || undefined}
              menuOpen={mobileMenuOpen}
              onOpenMenu={() => setMobileMenuOpen(true)}
              onOpenSearch={() => setSearchOpen(true)}
            />
            <MobileMenuSheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
              user={user}
              workspace={workspace}
              team={team}
              teams={teams}
              projects={projects}
              counts={counts}
              onOpenSearch={() => setSearchOpen(true)}
            />
            <QuickAddDialog
              open={quickOpen}
              onOpenChange={setQuickOpen}
              defaultDue={quickDefaults?.dueAt ?? null}
              defaultProjectId={quickDefaults?.projectId ?? null}
              projects={projects}
              members={members}
              currentUserId={user.id}
            />
            <TaskDrawer
              projects={projects}
              members={members}
              currentUserId={user.id}
            />
            <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
            <InviteTeammateDialog open={inviteOpen} onOpenChange={setInviteOpen} />
            <BottomAddTaskBar
              currentUserId={user.id}
              projects={projects}
              members={members}
            />
            {workspace && (
              <RealtimeBridge userId={user.id} workspaceId={workspace.id} />
            )}
          </div>
          </AppControlsProvider>
          </OptimisticDeletesProvider>
          </InviteProvider>
        </QuickAddProvider>
      </TeamProvider>
      </NotificationsProvider>
    </SidebarProvider>
    </MotionConfig>
  );
}
