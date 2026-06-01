"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { sileo } from "sileo";
import {
  DotsThree,
  Folder,
  MagnifyingGlass,
  Plus,
  PushPin,
  SidebarSimple,
  Trash,
  UserPlus,
} from "@/components/icons";
import { deleteProject, togglePinnedProject } from "@/lib/actions";
import {
  CompletedIcon,
  InboxIcon,
  MyDayIcon,
  UpcomingIcon,
  type NavIcon,
} from "@/components/animated-nav-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "@/components/profile-menu";
import { projectColor } from "@/components/project-dot";
import { AddProjectPopover } from "@/components/add-project-popover";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useInvite } from "@/components/invite-context";
import { useQuickAdd } from "@/components/quick-add-context";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { useSidebar } from "@/components/sidebar-context";
import type {
  Profile,
  Project,
  SidebarCounts,
  Team,
  Workspace,
} from "@/lib/queries";

// Link as a motion component so a row hover can drive variant labels
// ("rest" / "hover") down to the animated icon's internal SVG elements.
const MotionLink = motion.create(Link);

export interface SidebarProps {
  user: Profile;
  workspace: Workspace | null;
  team: Team | null;
  /** Every workspace (department) the user belongs to — drives the
   *  header switcher. `team` is the active one. */
  teams: Team[];
  teamRole: "admin" | "member" | null;
  projects: Project[];
  members: Profile[];
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
  projects,
  counts,
  onOpenSearch,
}: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

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
  // The pill shows the company name (one workspace = the company in
  // the post-0030 model). The legacy team-name fallback is kept only
  // for the rare case where workspace is null at render time.
  const workspaceName = workspace?.name ?? team?.name ?? "Workspace";
  const pinIds = new Set(user.pinned_project_ids ?? []);
  const sortedProjects = [...projects].sort((a, b) => {
    const ap = pinIds.has(a.id) ? 0 : 1;
    const bp = pinIds.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  const navItems = [
    {
      href: "/assigned-to-me",
      icon: MyDayIcon,
      label: "My Day",
      count: counts.today,
      active:
        pathname === "/assigned-to-me" ||
        pathname === "/my-tasks" ||
        pathname === "/today",
    },
    {
      href: "/inbox",
      icon: InboxIcon,
      label: "Inbox",
      count: counts.inbox,
      active: pathname === "/inbox",
    },
    {
      href: "/upcoming",
      icon: UpcomingIcon,
      label: "Upcoming",
      count: undefined, // browse view, not an attention queue - no badge
      active: pathname === "/upcoming",
    },
    {
      href: "/completed",
      icon: CompletedIcon,
      label: "Completed",
      count: undefined, // browse view, not an attention queue - no badge
      active: pathname === "/completed",
    },
  ];

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border/40 bg-white dark:bg-[oklch(0.185_0.005_250)]">
      {/* Workspace header — single-line company name. One company,
          one workspace, so no switcher; the pill is a Link to the
          People directory. Search + sidebar-toggle sit to the right. */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Link
          href="/workspace"
          aria-label={`${workspaceName} workspace`}
          className="focus-ring inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.04]"
        >
          <WorkspaceBadge color={team?.color} size={20} />
          <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight text-foreground">
            {workspaceName}
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onOpenSearch}
                  aria-label="Search"
                  className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
                >
                  <MagnifyingGlass size={17} />
                </button>
              }
            />
            <TooltipContent side="bottom">
              <span className="flex items-center gap-1.5">
                Search
                <kbd className="rounded bg-white/15 px-1 py-px text-[10px] font-medium leading-none text-white/90 dark:bg-white/10">
                  ⌘K
                </kbd>
              </span>
            </TooltipContent>
          </Tooltip>
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
          <div className="ml-auto flex items-center">
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
              taskCount={counts.projectCounts[p.id] ?? 0}
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
  icon: NavIcon;
  label: string;
  count?: number;
  active: boolean;
}) {
  const showCount = count !== undefined && count > 0;
  return (
    <MotionLink
      href={href}
      // Full-data prefetch (not just the loading boundary). These are
      // dynamic routes, and the realtime bridge's router.refresh()
      // invalidates the router cache on workspace task changes — without
      // forced prefetch every sidebar switch goes cold and re-runs the
      // page's queries, which is the lag between e.g. My Day and Inbox.
      // The sidebar is always on screen, so Next re-prefetches these the
      // moment the cache is invalidated, keeping the target warm.
      prefetch
      // Hovering anywhere on the row drives the icon's internal motion
      // (rays pulse, letter drops, page lifts, check draws) via variant
      // propagation — not a per-icon hover.
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={cn(
        "group/row focus-ring relative flex h-9 items-center gap-3 rounded-md px-3 text-[14px] transition-colors",
        active
          ? "font-semibold text-primary-readable"
          : "text-foreground/85 hover:text-foreground"
      )}
    >
      {/* Hover (non-active) = soft gray pill + blue text + blue icon.
          Active = blue text + icon only, no pill. */}
      {!active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-transparent transition-colors duration-150 ease-[var(--ease-out)] group-hover/row:bg-foreground/[0.06]"
        />
      )}
      <span className="relative z-[1] grid size-5 shrink-0 place-items-center">
        <Icon size={18} active={active} />
      </span>
      <span className="relative z-[1]">{label}</span>
      {/* Count sits inline next to the label (not pushed to the right
          edge) so the eye reads "label + how many" as one phrase. The
          motion.span runs a small scale-up whenever the number
          changes — animated key forces re-mount on count delta. */}
      {showCount && (
        <motion.span
          key={count}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 22 }}
          className={cn(
            "relative z-[1] grid h-[20px] min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/[0.06] text-muted-foreground"
          )}
        >
          {count}
        </motion.span>
      )}
    </MotionLink>
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
      icon: MyDayIcon,
      label: "My Day",
      active:
        pathname === "/assigned-to-me" ||
        pathname === "/my-tasks" ||
        pathname === "/today",
      count: counts.today,
    },
    {
      href: "/inbox",
      icon: InboxIcon,
      label: "Inbox",
      active: pathname === "/inbox",
      count: counts.inbox,
    },
    {
      href: "/upcoming",
      icon: UpcomingIcon,
      label: "Upcoming",
      active: pathname === "/upcoming",
      count: undefined, // browse view, not an attention queue - no badge
    },
    {
      href: "/completed",
      icon: CompletedIcon,
      label: "Completed",
      active: pathname === "/completed",
      count: undefined, // browse view, not an attention queue - no badge
    },
  ];

  return (
    <aside className="flex h-full w-[64px] shrink-0 flex-col items-center border-r border-border/40 bg-white dark:bg-[oklch(0.185_0.005_250)]">
      {/* Utility cluster: collapse toggle + search. The bell used to
          live here too; it now sits in the topbar next to the Add task
          CTA so the inbox is a route-agnostic primary affordance. */}
      <div className="flex flex-col items-center gap-0.5 pt-3">
        <RailButton label="Expand sidebar" side="right" onClick={toggle}>
          <SidebarSimple size={18} />
        </RailButton>
        <RailButton label="Search" side="right" onClick={onOpenSearch}>
          <MagnifyingGlass size={18} />
        </RailButton>
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
  icon: NavIcon;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <MotionLink
            href={href}
            aria-label={label}
            initial="rest"
            animate="rest"
            whileHover="hover"
            className={cn(
              "focus-ring relative grid size-9 place-items-center rounded-md transition-colors",
              active
                ? "text-primary-readable"
                : "text-foreground/85 hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            <Icon size={18} active={active} />
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary-readable"
              />
            )}
          </MotionLink>
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
  taskCount,
}: {
  id: string;
  name: string;
  active: boolean;
  color: string;
  pinned: boolean;
  taskCount: number;
}) {
  // The row is a wrapper (not the Link itself) so the `…` menu can sit
  // as a sibling button — nesting a button inside the <a> would be
  // invalid and would fight the link's navigation on click.
  return (
    <div className="group/proj relative">
      <Link
        href={`/projects/${id}`}
        className={cn(
          "focus-ring relative flex h-8 items-center gap-3 rounded-md pl-3 pr-8 text-[13px] transition-colors",
          active
            ? "font-semibold text-primary-readable"
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
      </Link>

      {/* Trailing slot. Pin indicator at rest; on hover (or while the
          menu is open) it cross-fades to the `…` actions button, pinned
          to the same spot so the row never reflows. */}
      {pinned && (
        <PushPin
          size={11}
          weight="fill"
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 z-[1] -translate-y-1/2 shrink-0 transition-opacity duration-150 group-hover/proj:opacity-0",
            active ? "text-primary-readable" : "text-muted-foreground/60"
          )}
        />
      )}
      <ProjectRowMenu id={id} name={name} pinned={pinned} taskCount={taskCount} />
    </div>
  );
}

/**
 * The per-project `…` menu in the sidebar: quick-add a task tagged to
 * this project, pin it to the top, invite a teammate, or delete the
 * project. Hidden until the row is hovered (kept visible while the menu
 * is open).
 */
function ProjectRowMenu({
  id,
  name,
  pinned,
  taskCount,
}: {
  id: string;
  name: string;
  pinned: boolean;
  taskCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const quickAdd = useQuickAdd();
  const invite = useInvite();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const togglePin = () => {
    togglePinnedProject(id).then((res) => {
      if (res?.error) {
        sileo.error({ title: res.error });
        return;
      }
      sileo.success({ title: res.pinned ? "Pinned to top" : "Unpinned" });
      router.refresh();
    });
  };

  // Async so ConfirmDialog's own transition tracks it: spinner shows
  // while the delete is in flight, dialog closes when it resolves.
  const remove = async () => {
    const res = await deleteProject(id);
    if (res?.error) {
      sileo.error({ title: res.error });
      return;
    }
    sileo.success({ title: "Project deleted" });
    // If we're viewing the project we just deleted, leave the now-dead
    // page so we don't 404.
    if (pathname === `/projects/${id}`) router.push("/assigned-to-me");
    router.refresh();
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${name}`}
          className={cn(
            // Click-through until revealed, so the right edge of the row
            // still navigates to the project at rest.
            "focus-ring absolute right-1 top-1/2 z-[2] grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground/80 transition-[opacity,background-color,color] duration-150 hover:bg-foreground/[0.08] hover:text-foreground",
            menuOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover/proj:pointer-events-auto group-hover/proj:opacity-100"
          )}
        >
          <DotsThree size={16} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="w-[200px]">
          <DropdownMenuItem onClick={() => quickAdd.open({ projectId: id })}>
            <Plus size={15} className="text-muted-foreground" />
            Add task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={togglePin}>
            <PushPin
              size={15}
              weight={pinned ? "fill" : "regular"}
              className="text-muted-foreground"
            />
            {pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => invite.open()}>
            <UserPlus size={15} className="text-muted-foreground" />
            Invite teammate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash size={15} />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${name}?`}
        description={
          taskCount > 0
            ? `This removes the project for everyone in the workspace. Its ${taskCount} open ${taskCount === 1 ? "task moves" : "tasks move"} to your Inbox, not deleted.`
            : "This removes the project for everyone in the workspace. Any tasks it holds move to your Inbox, not deleted."
        }
        confirmLabel="Delete project"
        onConfirm={remove}
      />
    </>
  );
}
