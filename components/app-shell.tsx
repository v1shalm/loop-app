"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Sidebar, type SidebarProps } from "@/components/sidebar";
import { SidebarProvider } from "@/components/sidebar-context";
import { TeamProvider } from "@/components/team-provider";
import { QuickAddProvider } from "@/components/quick-add-context";
import { BulkSelectionProvider } from "@/components/bulk-selection";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileFab } from "@/components/mobile-fab";
import { MobileMenuSheet } from "@/components/mobile-menu-sheet";

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
const KeyboardShortcutsDialog = dynamic(
  () =>
    import("@/components/keyboard-shortcuts-dialog").then(
      (m) => m.KeyboardShortcutsDialog
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
  teamRole,
  projects,
  members,
  counts,
  children,
}: Omit<SidebarProps, "onOpenQuickAdd"> & { children: React.ReactNode }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // Cmd/Ctrl+K — works even from inside inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (inEditable) return;

      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        setQuickOpen(true);
      } else if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SidebarProvider>
      <TeamProvider
        members={members}
        projects={projects}
        currentUserId={user.id}
      >
        <QuickAddProvider open={() => setQuickOpen(true)}>
         <BulkSelectionProvider>
          <div className="flex h-dvh w-full overflow-hidden bg-background">
            {/* Desktop sidebar — `contents` keeps it as a direct flex child
                so the desktop layout is byte-for-byte unchanged. On mobile
                the whole branch collapses out of the tree. */}
            <div className="contents max-md:hidden">
              <Sidebar
                user={user}
                workspace={workspace}
                team={team}
                teamRole={teamRole}
                projects={projects}
                members={members}
                counts={counts}
                onOpenQuickAdd={() => setQuickOpen(true)}
                onOpenSearch={() => setSearchOpen(true)}
                onOpenHelp={() => setHelpOpen(true)}
              />
            </div>
            <main className="flex-1 overflow-y-auto max-md:pb-[calc(env(safe-area-inset-bottom,0px)+64px)]">
              {children}
            </main>

            {/* Mobile shell — every piece is itself `md:hidden`, so on
                desktop the DOM still renders these elements but they have
                `display: none`. No desktop layout impact. */}
            <MobileBottomNav
              myWorkBadge={counts.today || undefined}
              inboxBadge={counts.inbox || undefined}
              menuOpen={mobileMenuOpen}
              onOpenMenu={() => setMobileMenuOpen(true)}
            />
            <MobileFab onClick={() => setQuickOpen(true)} />
            <MobileMenuSheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
              user={user}
              workspace={workspace}
              team={team}
              projects={projects}
              counts={counts}
              onOpenSearch={() => setSearchOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
            />
            <QuickAddDialog
              open={quickOpen}
              onOpenChange={setQuickOpen}
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
            <KeyboardShortcutsDialog
              open={helpOpen}
              onOpenChange={setHelpOpen}
            />
            {workspace && (
              <RealtimeBridge userId={user.id} workspaceId={workspace.id} />
            )}
            <BulkActionBar members={members} />
          </div>
         </BulkSelectionProvider>
        </QuickAddProvider>
      </TeamProvider>
    </SidebarProvider>
  );
}
