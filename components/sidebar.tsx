"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDots,
  CaretDown,
  Crosshair,
  MagnifyingGlass,
  Plus,
  SidebarSimple,
  Tray,
} from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  MemberPulse,
  Profile,
  Project,
  Team,
  Workspace,
} from "@/lib/queries";
import { ProfileMenu } from "@/components/profile-menu";
import { Avatar } from "@/components/avatar";
import { TeamPulse } from "@/components/team-pulse";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ProjectDot } from "@/components/project-dot";
import { AddProjectPopover } from "@/components/add-project-popover";
import {
  SidebarEmptyCard,
  ProjectsEmptyGraphic,
  TeamPulseEmptyGraphic,
} from "@/components/sidebar-empty-card";
import { useSidebar } from "@/components/sidebar-context";

export interface SidebarProps {
  user: Profile;
  workspace: Workspace | null;
  team: Team | null;
  teamRole: "admin" | "member" | null;
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
  team,
  teamRole,
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
  const isAdmin = teamRole === "admin";

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-[var(--ease-out)]",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* ── Top: workspace label + utility icons, then team identity ─── */}
      {collapsed ? (
        <div className="flex h-14 items-center justify-center border-b border-sidebar-border/60 px-2">
          <Tooltip>
            <TooltipTrigger
              onClick={toggle}
              aria-label="Expand sidebar"
              className="focus-ring grid size-9 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
            >
              <SidebarSimple size={16} />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="border-b border-sidebar-border/60 px-3 pt-3 pb-3">
          {/* Row 1 — workspace label, action icons aligned right */}
          <div className="flex h-7 items-center">
            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
              {workspaceName}
            </p>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger
                  onClick={onOpenSearch}
                  aria-label="Search (⌘K)"
                  className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
                >
                  <MagnifyingGlass size={15} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Search</TooltipContent>
              </Tooltip>
              <NotificationsPopover
                unreadCount={counts.inbox}
                currentUserId={user.id}
              />
              <Tooltip>
                <TooltipTrigger
                  onClick={toggle}
                  aria-label="Collapse sidebar"
                  className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
                >
                  <SidebarSimple size={15} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Row 2 — primary team identity */}
          {team && (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: team.color ?? "#94a3b8" }}
              />
              <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground">
                {team.name}
              </p>
              {isAdmin && (
                <span className="shrink-0 rounded-md border border-violet-200/70 bg-violet-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-700">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* ── Flat primary nav (no section header) ──────────────── */}
      <nav
        className={cn(
          "pt-1",
          collapsed ? "flex flex-col items-center gap-0.5 px-2" : "px-2"
        )}
      >
        <NavItem
          href="/assigned-to-me"
          icon={Crosshair}
          label="My work"
          badge={counts.today || undefined}
          active={
            pathname === "/assigned-to-me" ||
            pathname === "/my-tasks" ||
            pathname === "/today"
          }
          collapsed={collapsed}
        />
        <NavItem
          href="/inbox"
          icon={Tray}
          label="Inbox"
          badge={counts.inbox || undefined}
          active={pathname === "/inbox"}
          collapsed={collapsed}
        />
        <NavItem
          href="/upcoming"
          icon={CalendarDots}
          label="Upcoming"
          active={pathname === "/upcoming"}
          collapsed={collapsed}
        />
      </nav>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
        <Section
          title="Projects"
          collapsed={collapsed}
          headerAction={
            !collapsed ? (
              <div className="flex items-center gap-0.5">
                <Link
                  href="/projects"
                  className="focus-ring rounded px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground/80 transition-colors hover:bg-sidebar-accent/40 hover:text-foreground"
                  title="View all projects"
                >
                  All
                </Link>
                <AddProjectPopover />
              </div>
            ) : undefined
          }
        >
          {projects.length === 0 && !collapsed && (
            <SidebarEmptyCard
              graphic={<ProjectsEmptyGraphic />}
              hint="Group related tasks into projects. Start with one for your team."
            />
          )}
          {projects.map((p) => (
            <ProjectNavItem
              key={p.id}
              project={p}
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

      {/* ── Bottom: profile only (sounds + help live in the menu) ── */}
      <div
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "flex flex-col items-center gap-2 px-2 py-2" : "px-3 py-3"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/profile"
                  aria-label={user.name}
                  className="focus-ring grid size-9 place-items-center rounded-md hover:bg-accent/50"
                >
                  <Avatar
                    src={user.avatar_url}
                    initials={user.initials}
                    color={user.avatar_color}
                    size={28}
                  />
                </Link>
              }
            />
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
        ) : (
          <ProfileMenu user={user} onOpenHelp={onOpenHelp} />
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
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  collapsed: boolean;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
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
      <div className="flex h-7 items-center gap-1 pr-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="focus-ring group flex h-7 flex-1 items-center gap-1 rounded px-2 text-[11.5px] font-semibold tracking-tight text-muted-foreground/80 hover:text-foreground"
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
        {headerAction}
      </div>
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
            <span className="ml-2 text-background/70">{badge}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function ProjectNavItem({
  project,
  badge,
  active,
  collapsed,
}: {
  project: Project;
  badge?: string | number;
  active?: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={`/projects/${project.id}`}
      prefetch
      className={cn(
        "focus-ring group flex items-center text-[13.5px] transition-colors duration-150 ease-[var(--ease-out)]",
        collapsed
          ? "size-9 justify-center rounded-md"
          : "h-8 gap-2.5 rounded-lg px-2.5",
        active
          ? "bg-primary/8 font-medium text-primary"
          : "text-sidebar-foreground/90 hover:bg-accent/40 hover:text-foreground"
      )}
    >
      <ProjectDot project={project} size={9} />
      {!collapsed && <span className="truncate flex-1">{project.name}</span>}
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
          {project.name}
          {badge !== undefined && (
            <span className="ml-2 text-background/70">{badge}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
