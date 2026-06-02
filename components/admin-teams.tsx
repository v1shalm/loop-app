"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import { Avatar } from "@/components/avatar";
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  ShieldCheck,
  UsersThree,
} from "@/components/icons";
import {
  assignTeamManager,
  removeTeamManager,
  setSuperadmin,
} from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type {
  TeamAdminRow,
  TeamMember,
  TeamRosterRow,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type TeamWithRoster = TeamAdminRow & { roster: TeamRosterRow[] };

/**
 * The superadmin control room (rendered by /admin). Two stacked sections:
 *
 *   1. Superadmins — toggle company-wide access on any workspace member.
 *   2. Teams — per team, see and edit the manager roster (the approvers).
 *
 * Everything updates optimistically; the DB is the source of truth for the
 * rules it enforces (only a superadmin touches the superadmin tier; a team
 * keeps ≥1 manager), and those errors are surfaced verbatim with the local
 * state rolled back.
 */
export function AdminTeams({
  teams: serverTeams,
  members: serverMembers,
  currentUserId,
}: {
  teams: TeamWithRoster[];
  members: TeamMember[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(serverMembers);
  const [teams, setTeams] = useState(serverTeams);

  return (
    <div className="flex flex-col gap-10">
      <SuperadminSection
        members={members}
        currentUserId={currentUserId}
        onChange={setMembers}
      />
      <TeamsSection
        teams={teams}
        currentUserId={currentUserId}
        onChange={setTeams}
      />
    </div>
  );
}

// ── Superadmins ────────────────────────────────────────────────────────────

function SuperadminSection({
  members,
  currentUserId,
  onChange,
}: {
  members: TeamMember[];
  currentUserId: string;
  onChange: (next: TeamMember[]) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const superadmins = members.filter((m) => m.team_role === "superadmin");

  const toggle = (member: TeamMember) => {
    const makeSuper = member.team_role !== "superadmin";
    setPendingId(member.id);
    // Optimistic: flip this member's role in place.
    onChange(
      members.map((m) =>
        m.id === member.id
          ? { ...m, team_role: makeSuper ? "superadmin" : "member" }
          : m
      )
    );
    playSound(makeSuper ? "pin" : "uncomplete");
    startTransition(async () => {
      const res = await setSuperadmin(member.id, makeSuper);
      setPendingId(null);
      if (res.error) {
        sileo.error({ title: res.error });
        onChange(members); // revert to the snapshot captured at call time
        return;
      }
      sileo.success({
        title: makeSuper
          ? `${member.name} is now a superadmin`
          : `${member.name} is no longer a superadmin`,
      });
    });
  };

  return (
    <section>
      <SectionHeader
        icon={<ShieldCheck size={15} weight="fill" />}
        title="Superadmins"
        hint="Company-wide reach — every team, project, and task, plus this admin area."
        count={superadmins.length}
      />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {members.map((m, i) => {
          const isSuper = m.team_role === "superadmin";
          const isMe = m.id === currentUserId;
          const busy = pendingId === m.id;
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                i > 0 && "border-t border-border/40"
              )}
            >
              <Avatar
                src={m.avatar_url}
                initials={m.initials}
                color={m.avatar_color}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {m.name}
                  {isMe && (
                    <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground">
                  {m.team_role}
                </p>
              </div>

              {/* Self-demotion is disabled — a superadmin shouldn't be able to
                  lock themselves out of the only surface that grants the role
                  back. Promote/demote anyone else freely. */}
              <ToggleSwitch
                on={isSuper}
                busy={busy}
                disabled={isMe && isSuper}
                label={`${isSuper ? "Remove" : "Make"} superadmin: ${m.name}`}
                onToggle={() => toggle(m)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Teams + managers ─────────────────────────────────────────────────────────

function TeamsSection({
  teams,
  currentUserId,
  onChange,
}: {
  teams: TeamWithRoster[];
  currentUserId: string;
  onChange: (next: TeamWithRoster[]) => void;
}) {
  const patchTeam = (teamId: string, next: TeamRosterRow[]) =>
    onChange(
      teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              roster: next,
              managers: next
                .filter((r) => r.is_manager)
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  initials: r.initials,
                  avatar_color: r.avatar_color,
                  avatar_url: r.avatar_url,
                })),
            }
          : t
      )
    );

  return (
    <section>
      <SectionHeader
        icon={<UsersThree size={15} weight="fill" />}
        title="Teams & managers"
        hint="Managers approve their team's work. Every team keeps at least one."
        count={teams.length}
      />

      {teams.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-card px-4 py-6 text-center text-[12.5px] text-muted-foreground">
          No teams yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              currentUserId={currentUserId}
              onRosterChange={(next) => patchTeam(team.id, next)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TeamCard({
  team,
  currentUserId,
  onRosterChange,
}: {
  team: TeamWithRoster;
  currentUserId: string;
  onRosterChange: (next: TeamRosterRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const managerCount = team.roster.filter((r) => r.is_manager).length;

  const toggleManager = (row: TeamRosterRow) => {
    const makeManager = !row.is_manager;
    setPendingId(row.id);
    const snapshot = team.roster;
    onRosterChange(
      team.roster.map((r) =>
        r.id === row.id ? { ...r, is_manager: makeManager } : r
      )
    );
    playSound(makeManager ? "pin" : "uncomplete");
    startTransition(async () => {
      const res = makeManager
        ? await assignTeamManager(team.id, row.id)
        : await removeTeamManager(team.id, row.id);
      setPendingId(null);
      if (res.error) {
        sileo.error({ title: res.error });
        onRosterChange(snapshot);
        return;
      }
      sileo.success({
        title: makeManager
          ? `${row.name} manages ${team.name}`
          : `${row.name} is no longer a manager`,
      });
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/30"
      >
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: team.color ?? "var(--muted-foreground)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {team.name}
          </p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
            {" · "}
            {team.projectCount}{" "}
            {team.projectCount === 1 ? "project" : "projects"}
            {" · "}
            {managerCount} {managerCount === 1 ? "manager" : "managers"}
          </p>
        </div>

        {/* Manager avatars at a glance. */}
        <div className="flex -space-x-1.5">
          {team.managers.slice(0, 4).map((mgr) => (
            <span
              key={mgr.id}
              className="ring-2 ring-card rounded-full"
              title={mgr.name}
            >
              <Avatar
                src={mgr.avatar_url}
                initials={mgr.initials}
                color={mgr.avatar_color}
                size={22}
              />
            </span>
          ))}
        </div>

        <CaretDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/40"
          >
            {team.roster.length === 0 ? (
              <p className="px-4 py-4 text-[12px] text-muted-foreground">
                No members on this team yet. Add members from the team page,
                then assign a manager here.
              </p>
            ) : (
              <ul className="px-2 py-1.5">
                {team.roster.map((row) => {
                  const busy = pendingId === row.id;
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/30"
                    >
                      <Avatar
                        src={row.avatar_url}
                        initials={row.initials}
                        color={row.avatar_color}
                        size={26}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-foreground">
                          {row.name}
                          {row.id === currentUserId && (
                            <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                      </div>
                      {row.is_manager && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-readable">
                          <CheckCircle size={10} weight="fill" />
                          Manager
                        </span>
                      )}
                      <ToggleSwitch
                        on={row.is_manager}
                        busy={busy}
                        label={`${row.is_manager ? "Remove" : "Make"} manager: ${row.name}`}
                        onToggle={() => toggleManager(row)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  hint,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <header className="mb-3">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center text-muted-foreground">
          {icon}
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <p className="mt-1 pl-7 text-[12.5px] text-muted-foreground">{hint}</p>
    </header>
  );
}

/** A compact on/off pill switch with a busy state. */
function ToggleSwitch({
  on,
  busy,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy || disabled}
      onClick={onToggle}
      className={cn(
        "focus-ring relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        on ? "bg-primary" : "bg-border"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        className={cn(
          "grid size-[18px] place-items-center rounded-full bg-white shadow-sm",
          on ? "ml-[18px]" : "ml-[2px]"
        )}
      >
        {busy && (
          <CircleNotch size={11} className="animate-spin text-muted-foreground" />
        )}
      </motion.span>
    </button>
  );
}
