"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarBlank,
  CalendarDots,
  CaretDown,
  Crosshair,
  Hash,
  MagnifyingGlass,
  Plus,
  Question,
  SidebarSimple,
  Tray,
  UsersThree,
} from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MemberPulse, Profile, Project, Workspace } from "@/lib/queries";
import { SoundSwitch } from "@/components/sound-switch";
import { ProfileMenu } from "@/components/profile-menu";
import { TeamPulse } from "@/components/team-pulse";
import {
  SidebarEmptyCard,
  ProjectsEmptyGraphic,
  TeamPulseEmptyGraphic,
} from "@/components/sidebar-empty-card";
import { useSidebar } from "@/components/sidebar-context";

export interface SidebarProps {
  user: Profile;
  workspace: Workspace | null;
  projects: Project[];
  members: MemberPulse[];
  counts: {
    inbox: number;
    today: number;
    projectCounts: Record<string, number>;
  };
  onOpenQuickAdd?: () => void;
  onOpenSearch?: () => void;
  onOpenHelp?: () => void;
}

export function Sidebar({
  user,
  workspace,
  projects,
  members,
  counts,
  onOpenQuickAdd,
  onOpenSearch,
  onOpenHelp,
}: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const workspaceName = workspace?.name ?? "Loop";
  const initial = workspaceName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-[var(--ease-out)]",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* ── Top: workspace + search + collapse toggle ───────────── */}
      <div
        className={cn(
          "flex h-14 items-center gap-1 border-b border-sidebar-border/60",
          collapsed ? "justify-center px-2" : "px-3"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={toggle}
              aria-label="Expand sidebar"
              className="focus-ring grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <SidebarSimple size={16} />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate px-1.5 text-[14.5px] font-semibold tracking-tight text-foreground">
              {workspaceName}
            </span>
            <Tooltip>
              <TooltipTrigger
                onClick={onOpenSearch}
                aria-label="Search (⌘K)"
                className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <MagnifyingGlass size={16} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <SidebarSimple size={16} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* ── Primary CTA: Add Task ──────────────────────────────── */}
      <div
        className={cn(
          "pt-2 pb-1",
          collapsed ? "flex justify-center px-2" : "px-3"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={onOpenQuickAdd}
              aria-label="Add task (Q)"
              className="focus-ring surface-brand surface-brand-hover grid size-9 place-items-center rounded-md text-white shadow-soft-xs transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.96]"
            >
              <Plus size={16} weight="bold" />
            </TooltipTrigger>
            <TooltipContent side="right">Add task</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onOpenQuickAdd}
            className="focus-ring surface-brand surface-brand-hover flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[13.5px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
          >
            <Plus size={15} weight="bold" />
            Add task
            <kbd className="ml-auto rounded bg-white/15 px-1.5 py-px text-[11px] font-semibold tracking-wide text-white/90">
              Q
            </kbd>
          </button>
        )}
      </div>

      {/* ── Primary nav ─────────────────────────────────────────── */}
      <nav
        className={cn(
          "pt-1",
          collapsed ? "flex flex-col items-center gap-0.5 px-2" : "px-2"
        )}
      >
        <NavItem
          href="/inbox"
          icon={Tray}
          label="Inbox"
          badge={counts.inbox || undefined}
          active={pathname === "/inbox"}
          collapsed={collapsed}
        />
        <NavItem
          href="/assigned-to-me"
          icon={Crosshair}
          label="Assigned to me"
          active={
            pathname === "/assigned-to-me" || pathname === "/my-tasks"
          }
          collapsed={collapsed}
        />
      </nav>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
        <Section title="Workspace" collapsed={collapsed}>
          <NavItem
            href="/today"
            icon={CalendarBlank}
            label="Today"
            badge={counts.today || undefined}
            active={pathname === "/today"}
            collapsed={collapsed}
          />
          <NavItem
            href="/upcoming"
            icon={CalendarDots}
            label="Upcoming"
            active={pathname === "/upcoming"}
            collapsed={collapsed}
          />
          <NavItem
            href="/team"
            icon={UsersThree}
            label="Team"
            active={pathname === "/team" || pathname === "/people"}
            collapsed={collapsed}
          />
        </Section>

        <Section title="Projects" collapsed={collapsed}>
          {projects.length === 0 && !collapsed && (
            <SidebarEmptyCard
              graphic={<ProjectsEmptyGraphic />}
              hint="Group related tasks into projects. Start with one for your team."
            />
          )}
          {projects.map((p) => (
            <NavItem
              key={p.id}
              href={`/projects/${p.id}`}
              icon={Hash}
              label={p.name}
              badge={counts.projectCounts[p.id] || undefined}
              active={pathname === `/projects/${p.id}`}
              collapsed={collapsed}
            />
          ))}
        </Section>

        <Section title="Team Pulse" collapsed={collapsed}>
          {members.length <= 1 && !collapsed ? (
            <SidebarEmptyCard
              graphic={<TeamPulseEmptyGraphic />}
              hint="See what teammates are working on. Invite the team to fill this list."
            />
          ) : (
            <TeamPulse
              members={members}
              currentUserId={user.id}
              collapsed={collapsed}
            />
          )}
        </Section>
      </div>

      {/* ── Bottom: actions, sound switch, profile card ────────── */}
      <div
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "flex flex-col items-center gap-2 px-2 py-2" : "px-3 py-3"
        )}
      >
        {/* Notif + Help row */}
        {!collapsed && (
          <div className="mb-2 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/notifications"
                    aria-label="Notifications"
                    className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                  >
                    <Bell size={15} />
                  </Link>
                }
              />
              <TooltipContent side="top">Notifications</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={onOpenHelp}
                aria-label="Keyboard shortcuts (?)"
                className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <Question size={15} />
              </TooltipTrigger>
              <TooltipContent side="top">Keyboard shortcuts</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Sound switch */}
        {!collapsed && (
          <div className="mb-2">
            <SoundSwitch />
          </div>
        )}

        {/* Profile card */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/profile"
                  aria-label={user.name}
                  className="focus-ring grid size-9 place-items-center rounded-md hover:bg-accent/50"
                >
                  <span
                    className="grid size-7 place-items-center rounded-full text-[10.5px] font-semibold text-zinc-900"
                    style={{
                      backgroundColor: user.avatar_color,
                      boxShadow: "var(--shadow-avatar)",
                    }}
                  >
                    {user.initials}
                  </span>
                </Link>
              }
            />
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
        ) : (
          <ProfileMenu user={user} />
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
  collapsed,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-2">
        {children}
      </div>
    );
  }

  return (
    <div className="px-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring group flex h-7 w-full items-center gap-1 rounded px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground"
      >
        <CaretDown
          size={11}
          weight="bold"
          className={cn(
            "transition-transform duration-150 ease-[var(--ease-out)]",
            !open && "-rotate-90"
          )}
        />
        <span>{title}</span>
      </button>
      {open && <div className="mt-0.5 flex flex-col">{children}</div>}
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active,
  muted,
  collapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  active?: boolean;
  muted?: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      prefetch
      className={cn(
        "focus-ring group flex items-center text-[13.5px] transition-colors duration-150 ease-[var(--ease-out)]",
        collapsed
          ? "size-9 justify-center rounded-md"
          : "h-8 gap-2.5 rounded-lg px-2.5",
        active
          ? "bg-primary/8 font-medium text-primary"
          : muted
          ? "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          : "text-sidebar-foreground/90 hover:bg-accent/40 hover:text-foreground"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "shrink-0",
          active ? "text-primary" : "text-muted-foreground/90"
        )}
      />
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge !== undefined && (
        <span
          className={cn(
            "ml-auto rounded-md px-1.5 text-[11px] tabular-nums",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" sideOffset={6}>
          {label}
          {badge !== undefined && (
            <span className="ml-2 text-muted-foreground">{badge}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
