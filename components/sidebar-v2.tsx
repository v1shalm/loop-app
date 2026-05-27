"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { sileo } from "sileo";
import {
  CaretDown,
  Check,
  DotsThree,
  Folder,
  MagnifyingGlass,
  Plus,
  PushPin,
  SidebarSimple,
  Trash,
  UserPlus,
} from "@/components/icons";
import { deleteProject, setActiveTeam, togglePinnedProject } from "@/lib/actions";
import {
  CompletedIcon,
  InboxIcon,
  MyDayIcon,
  UpcomingIcon,
  type NavIcon,
} from "@/components/animated-nav-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useInvite } from "@/components/invite-context";
import { useQuickAdd } from "@/components/quick-add-context";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { useSidebar } from "@/components/sidebar-context";
import type {
  MemberPulse,
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
  teams,
  teamRole,
  projects,
  counts,
  onOpenSearch,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [, startSwitch] = useTransition();
  const invite = useInvite();
  const isAdmin = teamRole === "admin";

  const switchWorkspace = (id: string) => {
    setWsMenuOpen(false);
    if (id === team?.id) return;
    startSwitch(async () => {
      const res = await setActiveTeam(id);
      if (res?.error) {
        sileo.error({ title: res.error });
        return;
      }
      // Land on a workspace-agnostic page. Staying put would 404 if the
      // current route is a resource of the old workspace (a project,
      // a member detail) that the new workspace can't see.
      router.push("/assigned-to-me");
      router.refresh();
    });
  };

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
      count: 0,
      active: pathname === "/upcoming",
    },
    {
      href: "/completed",
      icon: CompletedIcon,
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
        <Popover open={wsMenuOpen} onOpenChange={setWsMenuOpen}>
          <PopoverTrigger
            aria-label={`${workspaceName} workspace menu`}
            className="focus-ring group/wp inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-foreground/[0.04] data-[popup-open]:bg-foreground/[0.06]"
          >
            <WorkspaceBadge color={team?.color} size={20} />
            <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight text-foreground">
              {workspaceName}
            </span>
            <CaretDown
              size={14}
              weight="bold"
              className="shrink-0 text-muted-foreground/70 transition-transform duration-150 group-data-[popup-open]/wp:rotate-180"
            />
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={6}
            className="w-[248px] p-1.5"
          >
            {/* Workspace switcher — the departments you belong to. The
                active one carries a check; picking another re-scopes the
                whole app (setActiveTeam → my_team_id). */}
            {teams.length > 1 && (
              <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-muted-foreground">
                Switch workspace
              </p>
            )}
            {teams.map((t) => {
              const active = t.id === team?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchWorkspace(t.id)}
                  className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.04]"
                >
                  <WorkspaceBadge color={t.color} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                    {t.name}
                  </span>
                  {active && (
                    <Check
                      size={13}
                      weight="bold"
                      className="shrink-0 text-primary-readable"
                    />
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setWsMenuOpen(false);
                  setCreateWsOpen(true);
                }}
                className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.04]"
              >
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-md border border-dashed border-border text-muted-foreground"
                >
                  <Plus size={12} weight="bold" />
                </span>
                New workspace
              </button>
            )}

            <div className="my-1 h-px bg-border" />

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setWsMenuOpen(false);
                    invite.open();
                  }}
                  className="focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground/[0.04]"
                >
                  <Plus size={13} className="text-muted-foreground" />
                  Invite teammates
                </button>
                <Link
                  href="/workspace/manage"
                  onClick={() => setWsMenuOpen(false)}
                  className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground/[0.04]"
                >
                  <CaretDown size={13} className="rotate-[-90deg] text-muted-foreground" />
                  Manage workspace
                </Link>
              </>
            ) : (
              <Link
                href="/workspace"
                onClick={() => setWsMenuOpen(false)}
                className="focus-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-foreground transition-colors hover:bg-foreground/[0.04]"
              >
                <CaretDown size={13} className="rotate-[-90deg] text-muted-foreground" />
                View members
              </Link>
            )}
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
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
          >
            <SidebarSimple size={17} />
          </button>
        </div>
      </div>

      <CreateWorkspaceDialog open={createWsOpen} onOpenChange={setCreateWsOpen} />

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
      count: 0,
    },
    {
      href: "/completed",
      icon: CompletedIcon,
      label: "Completed",
      active: pathname === "/completed",
      count: 0,
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
}: {
  id: string;
  name: string;
  active: boolean;
  color: string;
  pinned: boolean;
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
      <ProjectRowMenu id={id} name={name} pinned={pinned} />
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
}: {
  id: string;
  name: string;
  pinned: boolean;
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
        description="This removes the project for everyone in the workspace. Its tasks aren't deleted; they move to your Inbox."
        confirmLabel="Delete project"
        onConfirm={remove}
      />
    </>
  );
}
