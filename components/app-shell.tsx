"use client";

import { useEffect, useState } from "react";
import { Sidebar, type SidebarProps } from "@/components/sidebar";
import { QuickAddDialog } from "@/components/quick-add-dialog";
import { RealtimeBridge } from "@/components/realtime-bridge";
import { SidebarProvider } from "@/components/sidebar-context";
import { TaskDrawer } from "@/components/task-drawer";
import { TeamProvider } from "@/components/team-provider";
import { QuickAddProvider } from "@/components/quick-add-context";
import { SearchPalette } from "@/components/search-palette";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";

export function AppShell({
  user,
  workspace,
  projects,
  members,
  counts,
  children,
}: Omit<SidebarProps, "onOpenQuickAdd"> & { children: React.ReactNode }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
      <TeamProvider members={members} currentUserId={user.id}>
        <QuickAddProvider open={() => setQuickOpen(true)}>
          <div className="flex h-dvh w-full overflow-hidden bg-background">
            <Sidebar
              user={user}
              workspace={workspace}
              projects={projects}
              members={members}
              counts={counts}
              onOpenQuickAdd={() => setQuickOpen(true)}
              onOpenSearch={() => setSearchOpen(true)}
              onOpenHelp={() => setHelpOpen(true)}
            />
            <main className="flex-1 overflow-y-auto">{children}</main>
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
          </div>
        </QuickAddProvider>
      </TeamProvider>
    </SidebarProvider>
  );
}
