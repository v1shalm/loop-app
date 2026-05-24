"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sileo } from "sileo";
import { motion } from "motion/react";
import {
  CalendarDots,
  CaretDown,
  Crosshair,
  MagnifyingGlass,
  Plus,
  SidebarSimple,
  Star,
  Tray,
} from "@/components/icons";
import { togglePinnedProject } from "@/lib/actions";
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
  SidebarCounts,
  Team,
  Workspace,
} from "@/lib/queries";
import { ProfileMenu } from "@/components/profile-menu";
import { Avatar } from "@/components/avatar";
import { NotificationsPopover } from "@/components/notifications-popover";
import { projectColor } from "@/components/project-dot";
import { Folder } from "@/components/icons";
import { AddProjectPopover } from "@/components/add-project-popover";
import {
  SidebarEmptyCard,
  ProjectsEmptyGraphic,
} from "@/components/sidebar-empty-card";
import { WorkspacePill } from "@/components/workspace-pill";
import { useSidebar } from "@/components/sidebar-context";

export interface SidebarProps {
  user: Profile;
  workspace: Workspace | null;
  team: Team | null;
  teamRole: "admin" | "member" | null;
  projects: Project[];
  members: MemberPulse[];
  counts: SidebarCounts;
  onOpenQuickAdd?: () => void;
  onOpenSearch?: () => void;
  onOpenHelp?: () => void;
}

/**
 * Editorial layout — workspace pill + persistent search bar up top,
 * full-width brand CTA, flat primary nav, then sections. Phosphor icons
 * (regular weight at rest, fill on active).
 *
 * The polish layer (Emil-style) shows up in feel rather than footprint:
 *
 *  • Every interactive surface presses with scale 0.94–0.985. Buttons
 *    feel responsive without ever bouncing.
 *  • Easing is --ease-out everywhere (cubic-bezier(0.23, 1, 0.32, 1))
 *    so motion starts fast and settles, never the reverse.
 *  • Active nav row carries a sliding pill via Framer's layoutId —
 *    the indicator translates between rows on route change instead
 *    of cross-fading. Spring duration 0.32, bounce 0.18.
 *  • Group-hover wakes secondary detail: project dots scale 1.1,
 *    pin stars fade in, counts brighten.
 *  • Chevrons rotate over 180ms; tooltips inherit base-ui's
 *    origin-aware transform-origin; counts use tabular-nums.
 */
export function Sidebar({
  user,
  workspace,
  team,
  teamRole,
  projects,
  counts,
  onOpenQuickAdd,
  onOpenSearch,
  onOpenHelp,
}: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const workspaceName = workspace?.name ?? "Loop";
  const isAdmin = teamRole === "admin";

  const navItems = [
    {
      href: "/assigned-to-me",
      icon: Crosshair,
      label: "My work",
      badge: counts.today || undefined,
      active:
        pathname === "/assigned-to-me" ||
        pathname === "/my-tasks" ||
        pathname === "/today",
    },
    {
      href: "/inbox",
      icon: Tray,
      label: "Inbox",
      badge: counts.inbox || undefined,
      active: pathname === "/inbox",
    },
    {
      href: "/upcoming",
      icon: CalendarDots,
      label: "Upcoming",
      badge: undefined as string | number | undefined,
      active: pathname === "/upcoming",
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-[var(--ease-out)]",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* ── Header: workspace pill + utility icons + search bar ─ */}
      {collapsed ? (
        <div className="flex h-12 items-center justify-center px-2">
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
        <div className="px-3 pt-3">
          <div className="flex items-center gap-1">
            {team && (
              <WorkspacePill
                team={team}
                workspaceName={workspaceName}
                isAdmin={isAdmin}
              />
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <NotificationsPopover
                unreadCount={counts.inbox}
                currentUserId={user.id}
              />
              <Tooltip>
                <TooltipTrigger
                  onClick={toggle}
                  aria-label="Collapse sidebar"
                  className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.92]"
                >
                  <SidebarSimple size={14} />
                </TooltipTrigger>
                <TooltipContent side="bottom">Collapse sidebar</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSearch}
            className="focus-ring mt-2.5 flex w-full items-center gap-2 rounded-md border border-border/70 bg-card/60 px-2.5 py-1.5 text-left text-[12.5px] text-muted-foreground transition-[border-color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-card active:scale-[0.992]"
            aria-label="Search (⌘K)"
          >
            <MagnifyingGlass size={13} className="text-muted-foreground/70" />
            <span className="flex-1 truncate">Search or jump to…</span>
            <span className="ml-auto inline-flex items-center gap-0.5">
              <kbd className="rounded bg-accent/60 px-1 py-px text-[10px] font-medium leading-none text-muted-foreground">
                ⌘
              </kbd>
              <kbd className="rounded bg-accent/60 px-1 py-px text-[10px] font-medium leading-none text-muted-foreground">
                K
              </kbd>
            </span>
          </button>
        </div>
      )}

      {/* ── Flat primary nav with sliding active pill ──────────── */}
      <nav
        className={cn(
          "relative pt-3",
          collapsed ? "flex flex-col items-center gap-0.5 px-2" : "px-2"
        )}
      >
        {navItems.map((it) => (
          <NavItem
            key={it.href}
            href={it.href}
            icon={it.icon}
            label={it.label}
            badge={it.badge}
            active={it.active}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
        {(() => {
          const pinIds = user.pinned_project_ids ?? [];
          if (pinIds.length === 0) return null;
          const byId = new Map(projects.map((p) => [p.id, p]));
          const pinned = pinIds
            .map((id) => byId.get(id))
            .filter((p): p is Project => Boolean(p));
          if (pinned.length === 0) return null;
          return (
            <Section title="Pinned" collapsed={collapsed}>
              {pinned.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  pinned
                  badge={counts.projectCounts[p.id] || undefined}
                  active={pathname === `/projects/${p.id}`}
                  collapsed={collapsed}
                />
              ))}
            </Section>
          );
        })()}

        <Section
          title="Projects"
          collapsed={collapsed}
          headerAction={
            !collapsed ? (
              <div className="flex items-center gap-0.5">
                <Link
                  href="/projects"
                  className="focus-ring rounded px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground/80 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-sidebar-accent/40 hover:text-foreground"
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
          {(() => {
            const pinIds = new Set(user.pinned_project_ids ?? []);
            const unpinned = projects.filter((p) => !pinIds.has(p.id));
            return unpinned.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                badge={counts.projectCounts[p.id] || undefined}
                active={pathname === `/projects/${p.id}`}
                collapsed={collapsed}
              />
            ));
          })()}
        </Section>
      </div>

      {/* ── Add task dock — anchored above the profile ───────── */}
      <div
        className={cn(
          collapsed ? "flex justify-center px-2 pb-2" : "px-3 pb-3"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={onOpenQuickAdd}
              aria-label="Add task"
              className="focus-ring surface-brand surface-brand-hover grid size-9 place-items-center rounded-md text-white shadow-soft-xs transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.94]"
            >
              <Plus size={16} weight="bold" />
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="inline-flex items-center gap-1.5">
                Add task <Kbd>Q</Kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={onOpenQuickAdd}
            className="focus-ring surface-brand surface-brand-hover group/cta flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[13.5px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
          >
            <Plus size={15} weight="bold" />
            Add task
            <kbd className="ml-auto rounded bg-white/15 px-1.5 py-px text-[11px] font-semibold tracking-wide text-white/90 transition-colors duration-150 ease-[var(--ease-out)] group-hover/cta:bg-white/20">
              Q
            </kbd>
          </button>
        )}
      </div>

      {/* ── Profile dock ──────────────────────────────────────── */}
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
                  className="focus-ring grid size-9 place-items-center rounded-md transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 active:scale-[0.94]"
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
          <ProfileMenu
            user={user}
            onOpenHelp={onOpenHelp}
            progressToday={{
              done: counts.completedToday,
              total: counts.completedToday + counts.today,
            }}
          />
        )}
      </div>
    </aside>
  );
}

/* ── Compact key cap (tooltip helper) ─────────────────────────── */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded bg-background/15 px-1 py-px text-[10px] font-semibold leading-none text-background/85">
      {children}
    </kbd>
  );
}

/* ── Section: smooth chevron + inline actions ─────────────────── */
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
      <div className="flex flex-col items-center gap-0.5 px-2">{children}</div>
    );
  }

  return (
    <div className="px-2">
      <div className="flex h-7 items-center gap-1 pr-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="focus-ring flex h-7 flex-1 items-center gap-1 rounded px-2 text-[11.5px] font-semibold tracking-tight text-muted-foreground/80 transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground"
        >
          <CaretDown
            size={11}
            weight="bold"
            className={cn(
              "transition-transform duration-200 ease-[var(--ease-out)]",
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

/* ── Nav item with sliding active pill (Framer layoutId) ──────── */
function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  active?: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      prefetch
      className={cn(
        "focus-ring group/row relative flex items-center text-[13.5px] transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.985]",
        collapsed
          ? "size-9 justify-center rounded-md"
          : "h-8 gap-2.5 rounded-lg px-2.5",
        active
          ? "font-medium text-primary"
          : "text-sidebar-foreground/90 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={collapsed ? "nav-active-collapsed" : "nav-active"}
          aria-hidden
          className="surface-active absolute inset-0 rounded-md"
          transition={{ type: "spring", duration: 0.32, bounce: 0.18 }}
        />
      )}
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-accent/0 transition-colors duration-150 ease-[var(--ease-out)] group-hover/row:bg-accent/40"
        />
      )}
      <Icon
        size={16}
        weight={active ? "fill" : "regular"}
        className={cn(
          "relative z-[1] shrink-0 transition-colors duration-150 ease-[var(--ease-out)]",
          active ? "text-primary" : "text-muted-foreground/90"
        )}
      />
      {!collapsed && (
        <span className="relative z-[1] flex-1 truncate">{label}</span>
      )}
      {!collapsed && badge !== undefined && (
        <span
          className={cn(
            "relative z-[1] ml-auto rounded-md px-1.5 text-[11px] tabular-nums transition-colors duration-150 ease-[var(--ease-out)]",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground group-hover/row:text-foreground/80"
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

/* ── Project row: dot scales on hover, star reveals smoothly ──── */
function ProjectRow({
  project,
  badge,
  active,
  collapsed,
  pinned,
}: {
  project: Project;
  badge?: string | number;
  active?: boolean;
  collapsed: boolean;
  pinned?: boolean;
}) {
  const color = projectColor(project);

  if (collapsed) {
    const link = (
      <Link
        href={`/projects/${project.id}`}
        prefetch
        className={cn(
          "group/proj-col relative grid size-9 items-center justify-center rounded-md text-[13.5px] transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-none active:scale-[0.94]",
          !active && "hover:bg-accent/40"
        )}
      >
        {active && (
          <span
            aria-hidden
            className="surface-active absolute inset-0 rounded-md"
          />
        )}
        <Folder
          size={15}
          weight="fill"
          style={{ color }}
          className="relative z-[1] transition-transform duration-200 ease-[var(--ease-out)] group-hover/proj-col:scale-110"
        />
      </Link>
    );
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

  return (
    <div
      className={cn(
        "group/proj relative flex items-center text-[13.5px] transition-colors duration-150 ease-[var(--ease-out)]",
        "h-8 gap-2.5 rounded-lg px-2.5",
        active
          ? "font-medium text-foreground"
          : "text-sidebar-foreground/90 hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="surface-active pointer-events-none absolute inset-0 rounded-lg"
        />
      )}
      <Link
        href={`/projects/${project.id}`}
        prefetch
        className="focus-ring relative z-[1] flex min-w-0 flex-1 items-center gap-2.5 rounded outline-none transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
      >
        <Folder
          size={14}
          weight="fill"
          style={{ color }}
          className="shrink-0 transition-transform duration-200 ease-[var(--ease-out)] group-hover/proj:scale-110"
        />
        <span className="truncate">{project.name}</span>
      </Link>
      <PinToggle projectId={project.id} pinned={!!pinned} />
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-md px-1.5 text-[11px] tabular-nums transition-colors duration-150 ease-[var(--ease-out)]",
            active ? "bg-primary/15 text-primary" : "text-muted-foreground",
            !pinned && "group-hover/proj:hidden"
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function PinToggle({
  projectId,
  pinned,
}: {
  projectId: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(pinned);
  useEffect(() => setOptimistic(pinned), [pinned]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setOptimistic(!optimistic);
    startTransition(async () => {
      const res = await togglePinnedProject(projectId);
      if (res.error) {
        setOptimistic(pinned);
        sileo.error({ title: res.error });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={optimistic ? "Unpin project" : "Pin project"}
      aria-pressed={optimistic}
      className={cn(
        "focus-ring grid size-5 shrink-0 place-items-center rounded transition-[opacity,color,background-color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.88]",
        optimistic
          ? "text-amber-500 hover:text-amber-600"
          : "text-muted-foreground/60 opacity-0 hover:bg-accent/60 hover:text-foreground group-hover/proj:opacity-100 focus-visible:opacity-100"
      )}
    >
      <Star size={12} weight={optimistic ? "fill" : "regular"} />
    </button>
  );
}
