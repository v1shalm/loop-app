"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Gear,
  MagnifyingGlass,
  PushPin,
  SignOut,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { ProjectDot } from "@/components/project-dot";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type {
  Profile,
  Project,
  SidebarCounts,
  Team,
  Workspace,
} from "@/lib/queries";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  workspace: Workspace | null;
  team: Team | null;
  projects: Project[];
  counts: SidebarCounts;
  onOpenSearch: () => void;
}

/**
 * Mobile menu sheet — slides up from the bottom when the "Menu" tab is
 * tapped. Carries the secondary nav that doesn't fit on the four-tab
 * bottom bar: workspace, projects, profile, settings.
 *
 * Mobile-only by virtue of who renders it — `MobileBottomNav` is itself
 * `md:hidden`, so this sheet is never opened on desktop.
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  user,
  workspace,
  team,
  projects,
  counts,
  onOpenSearch,
}: MobileMenuSheetProps) {
  const pinIds = new Set(user.pinned_project_ids ?? []);
  const pinned = (user.pinned_project_ids ?? [])
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is Project => Boolean(p));
  const others = projects.filter((p) => !pinIds.has(p.id));

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[88dvh] gap-0 rounded-t-2xl p-0"
      >
        <div className="flex justify-center pb-1 pt-2">
          <span
            aria-hidden
            className="h-1 w-9 rounded-full bg-muted-foreground/30"
          />
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Workspace, projects, search, and account
        </SheetDescription>

        <div
          className="flex-1 overflow-y-auto px-3 pb-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          {team && workspace && (
            <div className="mb-3 mt-1 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-md text-[12px] font-semibold text-white"
                style={{ backgroundColor: team.color ?? "var(--primary)" }}
              >
                {team.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-foreground">
                  {team.name}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {workspace.name}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              close();
              onOpenSearch();
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-3 text-left text-[14px] text-muted-foreground transition-colors active:bg-card"
          >
            <MagnifyingGlass size={15} />
            <span>Search or jump to…</span>
          </button>

          {pinned.length > 0 && (
            <Section title="Pinned">
              {pinned.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  pinned
                  badge={counts.projectCounts[p.id]}
                  onClick={close}
                />
              ))}
            </Section>
          )}

          <Section title="Projects" trailing={
            <Link
              href="/projects"
              onClick={close}
              className="rounded px-1.5 text-[11px] font-medium text-muted-foreground active:bg-accent/40"
            >
              All
            </Link>
          }>
            {others.length === 0 ? (
              <p className="px-2.5 py-3 text-[12.5px] text-muted-foreground">
                No projects yet.
              </p>
            ) : (
              others.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  badge={counts.projectCounts[p.id]}
                  onClick={close}
                />
              ))
            )}
          </Section>

          <Section title="Account">
            <Link
              href="/profile"
              onClick={close}
              className="flex h-12 items-center gap-3 rounded-xl px-2.5 text-[14px] text-foreground active:bg-accent/40"
            >
              <Avatar
                src={user.avatar_url}
                initials={user.initials}
                color={user.avatar_color}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{user.name}</div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  View profile
                </div>
              </div>
            </Link>
            <Link
              href="/team/manage"
              onClick={close}
              className="flex h-11 items-center gap-3 rounded-xl px-2.5 text-[14px] text-foreground active:bg-accent/40"
            >
              <Gear size={18} className="text-muted-foreground" />
              <span>Team settings</span>
            </Link>
            <SignOutButton />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-[14px] text-rose-600 transition-opacity active:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
    >
      <SignOut size={18} />
      <span>Sign out</span>
    </button>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-2.5 pb-1">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
          {title}
        </h3>
        {trailing}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ProjectRow({
  project,
  badge,
  pinned,
  onClick,
}: {
  project: Project;
  badge?: number;
  pinned?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-2.5 text-[14px] text-foreground active:bg-accent/40"
      )}
    >
      <ProjectDot project={project} size={10} />
      <span className="flex-1 truncate">{project.name}</span>
      {pinned && (
        <PushPin size={12} weight="fill" className="-rotate-45 text-foreground/70" />
      )}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-md bg-accent/60 px-1.5 text-[11.5px] tabular-nums text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

