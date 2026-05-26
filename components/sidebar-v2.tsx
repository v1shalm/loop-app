"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  CalendarBlank,
  CalendarDots,
  CaretDown,
  Circle,
  Folder,
  List,
  MagnifyingGlass,
  PushPin,
  SidebarSimple,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ProfileMenu } from "@/components/profile-menu";
import { projectColor } from "@/components/project-dot";
import { AddProjectPopover } from "@/components/add-project-popover";
import { useSidebar } from "@/components/sidebar-context";
import type {
  MemberPulse,
  Profile,
  Project,
  SidebarCounts,
  Team,
  Workspace,
} from "@/lib/queries";

export interface SidebarProps {
  user: Profile;
  workspace: Workspace | null;
  team: Team | null;
  teamRole: "admin" | "member" | null;
  projects: Project[];
  members: MemberPulse[];
  counts: SidebarCounts;
  onOpenSearch?: () => void;
}

/**
 * Sidebar V2.
 *
 * Structure: 1-to-1 with V1.
 *   - Workspace header on top with utility cluster (search + bell)
 *   - "Work" section label
 *   - Four primary nav rows: My Day, Inbox, Upcoming, Completed
 *   - "Projects" section header with All link + add affordance
 *   - Project rows, pinned-first, folder-coloured glyph, pin marker
 *   - Profile menu at the bottom
 *
 * Look + feel: Any.do reference.
 *   - Hard-coded white surface, ignores the sidebar theme tokens
 *   - Blue active accent + filled blue count badge (instead of pink)
 *   - Gear-disc avatar workspace header (instead of V1's pill chip)
 *   - Reference icon set: Circle, List, CalendarDots, CalendarBlank
 *   - Sliding active pill via Framer's `layoutId` (carried over from
 *     V1 because the indicator translation reads better than a static
 *     fill — same animation, just blue tinted)
 *   - Spring hover micro-animation on icons
 */
export function SidebarV2({
  user,
  workspace,
  team,
  teamRole: _teamRole,
  projects,
  counts,
  onOpenSearch,
}: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  void _teamRole;

  if (collapsed) {
    return (
      <SidebarRail
        user={user}
        projects={projects}
        counts={counts}
        onOpenSearch={onOpenSearch}
      />
    );
  }
  // Prefer the team name (what V1's WorkspacePill shows in the same
  // slot) and only fall back to workspace name.
  const workspaceName = team?.name ?? workspace?.name ?? "Workspace";
  const pinIds = new Set(user.pinned_project_ids ?? []);
  const sortedProjects = [...projects].sort((a, b) => {
    const ap = pinIds.has(a.id) ? 0 : 1;
    const bp = pinIds.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  const navItems = [
    {
      href: "/assigned-to-me",
      icon: Circle,
      label: "My Day",
      count: counts.today,
      active:
        pathname === "/assigned-to-me" ||
        pathname === "/my-tasks" ||
        pathname === "/today",
    },
    {
      href: "/inbox",
      icon: List,
      label: "Inbox",
      count: counts.inbox,
      active: pathname === "/inbox",
    },
    {
      href: "/upcoming",
      icon: CalendarDots,
      label: "Upcoming",
      count: 0,
      active: pathname === "/upcoming",
    },
    {
      href: "/completed",
      icon: CalendarBlank,
      label: "Completed",
      count: 0,
      active: pathname === "/completed",
    },
  ];

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border/40 bg-white dark:bg-[oklch(0.185_0.005_250)]">
      {/* Workspace header — single-line workspace name in V2's blue
          accent + caret. Whole pill is a popover trigger for the
          workspace menu. Right side: search + bell + sidebar-toggle. */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Popover>
          <PopoverTrigger
            aria-label="Workspace menu"
            className="focus-ring group/wp inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-foreground/[0.04] data-[popup-open]:bg-foreground/[0.06]"
          >
            <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight text-primary">
              {workspaceName}
            </span>
            <CaretDown
              size={14}
              weight="bold"
              className="shrink-0 text-primary/70 transition-transform duration-150 group-data-[popup-open]/wp:rotate-180"

            />
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={6}
            className="w-[220px]"
          >
            <Link
              href="/team"
              className="focus-ring block rounded-md px-3 py-2.5 text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              Add members
            </Link>
            <Link
              href="/team"
              className="focus-ring block rounded-md px-3 py-2.5 text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              Copy invitation link
            </Link>
            <Link
              href="/team"
              className="focus-ring block rounded-md px-3 py-2.5 text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              Manage workspace
            </Link>
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
          >
            <MagnifyingGlass size={17} />
          </button>
          <NotificationsPopover currentUserId={user.id} className="size-7" />
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
          >
            <SidebarSimple size={17} />
          </button>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="mt-2 flex flex-col px-2">
        {navItems.map((item) => (
          <NavRow key={item.href} {...item} />
        ))}
      </nav>

      {/* Projects: header (with All link + add) + pinned-first list,
          same structure as V1. */}
      <div className="mt-5 flex flex-col px-2">
        <div className="flex items-center gap-2 px-3 pr-2">
          <span className="text-[14px] font-bold tracking-tight text-foreground">
            Projects
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <Link
              href="/projects"
              className="focus-ring rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              All
            </Link>
            <AddProjectPopover />
          </div>
        </div>
        <div className="mt-2 flex flex-col">
          {sortedProjects.map((p) => (
            <ProjectRow
              key={p.id}
              id={p.id}
              name={p.name}
              active={pathname === `/projects/${p.id}`}
              color={projectColor(p)}
              pinned={pinIds.has(p.id)}
            />
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-1.5 text-[12px] text-muted-foreground/70">
              No projects yet
            </p>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="border-t border-border/40 px-2 py-2">
        <ProfileMenu user={user} />
      </div>
    </aside>
  );
}

function NavRow({
  href,
  icon: Icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: PhosphorIcon;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/row focus-ring relative flex h-9 items-center gap-3 rounded-md px-3 text-[14px] transition-colors",
        active
          ? "font-semibold text-primary"
          : "text-foreground/85 hover:text-foreground"
      )}
    >
      {/* Hover (non-active) = soft gray pill + blue text + blue icon.
          Active = blue text + icon only, no pill. The pill is a hover
          affordance; the active row keeps a quieter signal so the
          eye doesn't double-process "you're here" and "you can click
          this." */}
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-transparent transition-colors duration-150 ease-[var(--ease-out)] group-hover/row:bg-foreground/[0.06]"
        />
      )}
      <motion.span
        aria-hidden
        className="relative z-[1] grid size-5 shrink-0 place-items-center"
        whileHover={{ scale: 1.18, rotate: -6 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
      >
        <Icon size={17} weight={active ? "fill" : "regular"} />
      </motion.span>
      <span className="relative z-[1] flex-1">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "relative z-[1] grid h-[20px] min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * 64px-wide collapsed rail. Same conceptual structure as the expanded
 * sidebar — utility cluster, primary nav, projects, profile — but
 * stripped to icons. Labels surface as tooltips on hover so the rail
 * stays discoverable. Active nav rows get a subtle blue dot indicator
 * underneath the icon (instead of the expanded sidebar's filled blue
 * count badge, which has no room here).
 */
function SidebarRail({
  user,
  projects,
  counts,
  onOpenSearch,
}: {
  user: Profile;
  projects: Project[];
  counts: SidebarCounts;
  onOpenSearch?: () => void;
}) {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const pinIds = new Set(user.pinned_project_ids ?? []);
  const pinned = projects.filter((p) => pinIds.has(p.id));

  const navItems = [
    {
      href: "/assigned-to-me",
      icon: Circle,
      label: "My Day",
      active:
        pathname === "/assigned-to-me" ||
        pathname === "/my-tasks" ||
        pathname === "/today",
      count: counts.today,
    },
    {
      href: "/inbox",
      icon: List,
      label: "Inbox",
      active: pathname === "/inbox",
      count: counts.inbox,
    },
    {
      href: "/upcoming",
      icon: CalendarDots,
      label: "Upcoming",
      active: pathname === "/upcoming",
      count: 0,
    },
    {
      href: "/completed",
      icon: CalendarBlank,
      label: "Completed",
      active: pathname === "/completed",
      count: 0,
    },
  ];

  return (
    <aside className="flex h-full w-[64px] shrink-0 flex-col items-center border-r border-border/40 bg-white dark:bg-[oklch(0.185_0.005_250)]">
      {/* Utility cluster: collapse toggle, search, bell.
          Same three icons as the expanded sidebar's top-right
          cluster, just stacked vertically. */}
      <div className="flex flex-col items-center gap-0.5 pt-3">
        <RailButton label="Expand sidebar" side="right" onClick={toggle}>
          <SidebarSimple size={18} />
        </RailButton>
        <RailButton label="Search" side="right" onClick={onOpenSearch}>
          <MagnifyingGlass size={18} />
        </RailButton>
        <Tooltip>
          <TooltipTrigger
            render={<NotificationsPopover currentUserId={user.id} className="size-9" />}
          />
          <TooltipContent side="right">Notifications</TooltipContent>
        </Tooltip>
      </div>

      {/* Divider — same hairline as the expanded sidebar's section
          separators. Gives the eye a clear handoff between the
          utility cluster and the nav list. */}
      <div className="my-3 h-px w-7 bg-border/60" />

      {/* Primary nav — My Day, Inbox, Upcoming, Completed.
          Active row gets a 4px primary-color dot under the icon. */}
      <nav className="flex flex-col items-center gap-0.5">
        {navItems.map((item) => (
          <RailNavLink key={item.href} {...item} />
        ))}
      </nav>

      {pinned.length > 0 && (
        <>
          <div className="my-3 h-px w-7 bg-border/60" />
          {/* Pinned projects only — the collapsed rail has no room for
              an unbounded project list. Pin discipline matters more
              when space is scarce. */}
          <div className="flex flex-col items-center gap-0.5">
            {pinned.map((p) => (
              <RailProjectLink
                key={p.id}
                id={p.id}
                name={p.name}
                color={projectColor(p)}
                active={pathname === `/projects/${p.id}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Profile at the bottom — same ProfileMenu component in its
          compact (avatar-only) mode. */}
      <div className="pb-2">
        <ProfileMenu user={user} compact />
      </div>
    </aside>
  );
}

function RailButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string;
  side: "right";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="focus-ring grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            {children}
          </button>
        }
      />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

function RailNavLink({
  href,
  icon: Icon,
  label,
  active,
  count,
}: {
  href: string;
  icon: PhosphorIcon;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            className={cn(
              "focus-ring relative grid size-9 place-items-center rounded-md transition-colors",
              active
                ? "text-primary"
                : "text-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            <Icon size={18} weight={active ? "fill" : "regular"} />
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary"
              />
            )}
          </Link>
        }
      />
      <TooltipContent side="right">
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-1.5 text-background/60 tabular-nums">{count}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function RailProjectLink({
  id,
  name,
  color,
  active,
}: {
  id: string;
  name: string;
  color: string;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={`/projects/${id}`}
            aria-label={name}
            className={cn(
              "focus-ring relative grid size-9 place-items-center rounded-md transition-colors",
              active ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]"
            )}
          >
            <Folder size={17} weight="fill" style={{ color }} />
          </Link>
        }
      />
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  );
}

function ProjectRow({
  id,
  name,
  active,
  color,
  pinned,
}: {
  id: string;
  name: string;
  active: boolean;
  color: string;
  pinned: boolean;
}) {
  return (
    <Link
      href={`/projects/${id}`}
      className={cn(
        "group/proj focus-ring relative flex h-8 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors",
        active
          ? "font-semibold text-primary"
          : "text-foreground/85 hover:text-foreground"
      )}
    >
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-transparent transition-colors duration-150 ease-[var(--ease-out)] group-hover/proj:bg-foreground/[0.06]"
        />
      )}
      <motion.span
        aria-hidden
        className="relative z-[1] grid size-5 shrink-0 place-items-center"
        whileHover={{ scale: 1.18, rotate: -6 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
      >
        <Folder size={15} weight="fill" style={{ color }} />
      </motion.span>
      <span className="relative z-[1] min-w-0 flex-1 truncate">{name}</span>
      {pinned && (
        <PushPin
          size={11}
          weight="fill"
          className={cn(
            "relative z-[1] shrink-0",
            active ? "text-primary" : "text-muted-foreground/60"
          )}
        />
      )}
    </Link>
  );
}
