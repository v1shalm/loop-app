"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarBlank,
  CalendarDots,
  CaretDown,
  CaretRight,
  Crosshair,
  Hash,
  MagnifyingGlass,
  Plus,
  Question,
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
  const { collapsed } = useSidebar();
  const workspaceName = workspace?.name ?? "Loop";
  const initial = workspaceName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-[var(--ease-out)]",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* ── Top: workspace + search ─────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 items-center gap-2",
          collapsed ? "justify-center px-2" : "px-3"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              aria-label={workspaceName}
              className="focus-ring surface-brand grid size-[32px] place-items-center rounded-[10px] text-[13px] font-bold text-white shadow-[var(--shadow-brand-tile)]"
            >
              {initial}
            </TooltipTrigger>
            <TooltipContent side="right">{workspaceName}</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1">
              <span className="surface-brand grid size-[26px] place-items-center rounded-md text-[12px] font-bold text-white shadow-[var(--shadow-brand-tile)]">
                {initial}
              </span>
              <span className="truncate text-[14px] font-semibold tracking-tight text-foreground">
                {workspaceName}
              </span>
            </div>
            <button
              onClick={onOpenSearch}
              aria-label="Search (⌘K)"
              title="Search (⌘K)"
              className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <MagnifyingGlass size={16} />
            </button>
          </>
        )}
      </div>

      {/* ── Primary CTA: Add Task ──────────────────────────────── */}
      <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={onOpenQuickAdd}
              aria-label="Add task (Q)"
              className="focus-ring surface-brand surface-brand-hover grid size-10 place-items-center rounded-md text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.96]"
            >
              <Plus size={18} weight="bold" />
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
      <nav className={cn("pt-1", collapsed ? "px-2" : "px-2")}>
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
          <Link
            href="/profile"
            aria-label={user.name}
            title={user.name}
            className="focus-ring grid size-8 place-items-center rounded-full text-[11px] font-semibold text-zinc-900"
            style={{
              backgroundColor: user.avatar_color,
              boxShadow: "var(--shadow-avatar)",
            }}
          >
            {user.initials}
          </Link>
        ) : (
          <Link
            href="/profile"
            className="focus-ring flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 shadow-soft-xs transition-colors hover:bg-accent/40"
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
          </Link>
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
    return <div className="flex flex-col px-1.5">{children}</div>;
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
      className={cn(
        "focus-ring group flex items-center rounded-lg text-[13.5px] transition-colors duration-150 ease-[var(--ease-out)]",
        collapsed ? "h-9 w-9 justify-center" : "h-8 gap-2.5 px-2.5",
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
