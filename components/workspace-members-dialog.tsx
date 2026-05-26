"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { sileo } from "sileo";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  Copy,
  LinkSimple,
  MagnifyingGlass,
  PaperPlaneTilt,
  Trash,
  X,
} from "@/components/icons";
import {
  cancelInvite,
  changeTeamMemberRole,
  removeTeamMember,
  sendInvite,
} from "@/lib/actions";
import type { PendingInvitation, Team, TeamMember } from "@/lib/queries";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type Role = "admin" | "member";

export interface WorkspaceMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  currentUserId: string;
  members: TeamMember[];
  pendingInvites: PendingInvitation[];
}

/**
 * Single canonical surface for workspace membership. Combines invite
 * (email or link), search, member roles, removal, and pending invites.
 *
 * Replaces the /team/manage page and the standalone InviteTeammateDialog
 * for the workspace-management flow. Server passes in members + invites
 * so the dialog renders instantly without a client-side fetch round-trip.
 */
export function WorkspaceMembersDialog({
  open,
  onOpenChange,
  team,
  currentUserId,
  members,
  pendingInvites: serverInvites,
}: WorkspaceMembersDialogProps) {
  // Local mirror so a fresh invite shows up immediately without waiting
  // for the server-side revalidate to round-trip.
  const [invites, setInvites] = useState(serverInvites);
  useEffect(() => setInvites(serverInvites), [serverInvites]);

  const [query, setQuery] = useState("");

  // Members + pending invites both rendered in the same list with a
  // status badge, so the user sees the full picture in one column.
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  const filteredInvites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter((i) => i.email.toLowerCase().includes(q));
  }, [invites, query]);

  // The "Invite with link" row reflects the most-recent open invite.
  // When the user generates a new invite via email, this row updates
  // automatically. Without any pending invites it shows a soft hint.
  const latestInvite = invites[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-label="Workspace members"
        className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        {/* Header. Team name on the left, close on the right. No
            description copy. The h2 below sets context. */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <p className="truncate text-[14px] font-medium text-muted-foreground">
            {team?.name ?? "Workspace"}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-5 py-5">
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground">
            Members
          </h2>

          {/* Invite with email */}
          <InviteEmailRow
            onCreated={(inv) =>
              setInvites((prev) => [inv, ...prev])
            }
          />

          {/* Invite with link */}
          <InviteLinkRow invite={latestInvite} />

          {/* Search */}
          <SearchRow value={query} onChange={setQuery} />

          {/* Members + pending invites, one continuous list separated
              by hairlines. Member rows first, then pending invite rows
              with a faded "Pending" badge so unfilled seats are
              obvious without a separate section header. */}
          <ul className="mt-1">
            {filteredMembers.length === 0 && filteredInvites.length === 0 ? (
              <li className="py-6 text-center text-[12.5px] text-muted-foreground">
                No matches.
              </li>
            ) : (
              <>
                {filteredMembers.map((m) => (
                  <li
                    key={m.id}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <MemberRow
                      member={m}
                      isMe={m.id === currentUserId}
                    />
                  </li>
                ))}
                {filteredInvites.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <PendingInviteRow
                      invite={inv}
                      onCancelled={(id) =>
                        setInvites((prev) =>
                          prev.filter((i) => i.id !== id)
                        )
                      }
                    />
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Invite with email ───────────────────────────────────────────────────────

function InviteEmailRow({
  onCreated,
}: {
  onCreated: (inv: PendingInvitation) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await sendInvite(trimmed, role);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      onCreated({
        id: `temp-${Date.now()}`,
        email: trimmed.toLowerCase(),
        role,
        token: res.token!,
        created_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 14 * 24 * 3600 * 1000
        ).toISOString(),
      });
      playSound("added");
      sileo.success({ title: "Invite link ready below" });
      setEmail("");
    });
  };

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
        <PaperPlaneTilt size={13} className="text-muted-foreground" />
        Invite with email
      </div>
      <div className="mt-2 flex items-center gap-2 border-b border-border/60 pb-3">
        <input
          type="email"
          value={email}
          disabled={pending}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !pending && email.trim()) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add emails, separated by commas or spaces"
          className="focus-ring h-9 min-w-0 flex-1 rounded-md bg-transparent px-1 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
        <Popover>
          <PopoverTrigger
            disabled={pending}
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            {role === "admin" ? "Admin" : "Member"}
            <CaretDown size={9} weight="bold" className="opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[180px] gap-0 p-1">
            <RoleRow
              selected={role === "member"}
              label="Member"
              hint="Works on tasks"
              onSelect={() => setRole("member")}
            />
            <RoleRow
              selected={role === "admin"}
              label="Admin"
              hint="Can also manage members"
              onSelect={() => setRole("admin")}
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !email.trim()}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-primary-readable transition-colors hover:bg-primary/8 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {pending ? (
            <CircleNotch size={12} className="animate-spin" />
          ) : null}
          Invite
        </button>
      </div>
    </section>
  );
}

// ── Invite with link ────────────────────────────────────────────────────────

function InviteLinkRow({ invite }: { invite: PendingInvitation | null }) {
  const [copied, setCopied] = useState(false);

  const url =
    invite && typeof window !== "undefined"
      ? `${window.location.origin}/accept-invite/${invite.token}`
      : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      playSound("pin");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      sileo.error({
        title: "Couldn't copy. Select the link and copy it manually.",
      });
    }
  };

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
        <LinkSimple size={13} className="text-muted-foreground" />
        Invite with link
      </div>
      <div className="mt-2 flex items-center gap-2 border-b border-border/60 pb-3">
        {url ? (
          <>
            <code className="min-w-0 flex-1 truncate px-1 text-[12.5px] text-muted-foreground">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className={cn(
                "focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors",
                copied
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-primary-readable hover:bg-primary/8"
              )}
            >
              {copied ? (
                <>
                  <CheckCircle size={12} weight="fill" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </>
        ) : (
          <p className="px-1 py-2 text-[12.5px] text-muted-foreground">
            Send an invite email above to get a shareable link.
          </p>
        )}
      </div>
    </section>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────

function SearchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name or email"
          className="focus-ring h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <MagnifyingGlass size={14} className="text-muted-foreground/70" />
      </div>
    </section>
  );
}

// ── Member row ──────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isMe,
}: {
  member: TeamMember;
  isMe: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optRole, setOptRole] = useState<Role>(member.team_role);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setRole = (next: Role) => {
    const prev = optRole;
    setOptRole(next);
    startTransition(async () => {
      const res = await changeTeamMemberRole(member.id, next);
      if (res.error) {
        sileo.error({ title: res.error });
        setOptRole(prev);
      } else {
        sileo.success({ title: `${member.name} is now ${next}` });
      }
    });
  };

  const actuallyRemove = () => {
    playSound("deleted");
    startTransition(async () => {
      const res = await removeTeamMember(member.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.success({ title: `${member.name} removed` });
    });
  };

  return (
    <article className="group/row flex items-center gap-3 py-3 transition-colors">
      <Avatar
        src={member.avatar_url}
        initials={member.initials}
        color={member.avatar_color}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-foreground">
          {member.name}
          {isMe && (
            <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
              (you)
            </span>
          )}
        </p>
        {member.role && (
          <p className="truncate text-[11.5px] text-muted-foreground">
            {member.role}
          </p>
        )}
      </div>
      <Popover>
        <PopoverTrigger
          disabled={pending || isMe}
          aria-label={`Role for ${member.name}: ${optRole}`}
          className={cn(
            "focus-ring inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
            optRole === "admin"
              ? "text-primary-readable hover:bg-primary/8"
              : "text-foreground hover:bg-accent/40"
          )}
        >
          {optRole === "admin" ? "Admin" : "Member"}
          <CaretDown size={9} weight="bold" className="opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[200px] gap-0 p-1">
          <RoleRow
            selected={optRole === "member"}
            label="Member"
            hint="Works on tasks"
            onSelect={() => setRole("member")}
          />
          <RoleRow
            selected={optRole === "admin"}
            label="Admin"
            hint="Can also manage members"
            onSelect={() => setRole("admin")}
          />
          {!isMe && (
            <>
              <div className="my-1 h-px bg-border/60" />
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
              >
                <Trash size={13} />
                Remove from workspace
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${member.name}?`}
        description={
          <>
            They&apos;ll lose access to this workspace and its tasks. You can
            invite them back any time.
          </>
        }
        confirmLabel="Remove"
        onConfirm={actuallyRemove}
      />
    </article>
  );
}

// ── Pending invite row ──────────────────────────────────────────────────────

function PendingInviteRow({
  invite,
  onCancelled,
}: {
  invite: PendingInvitation;
  onCancelled: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  const expiresIn = Math.max(
    0,
    Math.ceil(
      (new Date(invite.expires_at).getTime() - Date.now()) /
        (24 * 3600 * 1000)
    )
  );
  const expiresLabel =
    expiresIn === 0
      ? "expires today"
      : expiresIn === 1
        ? "expires tomorrow"
        : `expires in ${expiresIn} days`;

  const cancel = () => {
    playSound("deleted");
    startTransition(async () => {
      const res = await cancelInvite(invite.id);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      onCancelled(invite.id);
      sileo.success({ title: "Invite cancelled" });
    });
  };

  return (
    <article className="group/row flex items-center gap-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <PaperPlaneTilt size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">
          {invite.email}
        </p>
        <p className="text-[11.5px] text-muted-foreground">
          {invite.role === "admin" ? "Admin" : "Member"} · {expiresLabel}
        </p>
      </div>
      <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
        Pending
      </span>
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        aria-label={`Cancel invite to ${invite.email}`}
        className="focus-ring grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 md:opacity-0 md:group-hover/row:opacity-100 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
      >
        {pending ? (
          <CircleNotch size={13} className="animate-spin" />
        ) : (
          <X size={13} weight="bold" />
        )}
      </button>
    </article>
  );
}

// ── Shared role row ─────────────────────────────────────────────────────────

function RoleRow({
  selected,
  label,
  hint,
  onSelect,
}: {
  selected: boolean;
  label: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "focus-ring flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors",
        selected
          ? "bg-primary/8 text-primary-readable"
          : "text-foreground hover:bg-accent/40"
      )}
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span
        className={cn(
          "text-[11px]",
          selected ? "text-primary-readable/70" : "text-muted-foreground"
        )}
      >
        {hint}
      </span>
    </button>
  );
}
