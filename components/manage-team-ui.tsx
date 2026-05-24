"use client";

import { useEffect, useState, useTransition } from "react";
import { sileo } from "sileo";
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  Copy,
  PaperPlaneTilt,
  Trash,
  UsersThree,
  X,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  cancelInvite,
  changeTeamMemberRole,
  removeTeamMember,
  sendInvite,
} from "@/lib/actions";
import type { PendingInvitation, TeamMember } from "@/lib/queries";

export function ManageTeamUI({
  members,
  pendingInvites,
}: {
  members: TeamMember[];
  pendingInvites: PendingInvitation[];
}) {
  // Local mirror so a freshly-sent invite shows up immediately without
  // waiting for the server-side revalidate to round-trip. The parent
  // page is a server component, so revalidatePath does refresh the
  // initial prop on next navigation — this just covers the in-flight
  // window between submit and that refresh.
  const [invites, setInvites] = useState(pendingInvites);
  useEffect(() => setInvites(pendingInvites), [pendingInvites]);

  return (
    <div className="flex flex-col gap-6">
      <InvitePanel
        onCreated={(inv) => setInvites((prev) => [inv, ...prev])}
      />
      {invites.length > 0 && (
        <PendingInvitesList
          invites={invites}
          onCancelled={(id) =>
            setInvites((prev) => prev.filter((i) => i.id !== id))
          }
        />
      )}
      <MemberList members={members} />
    </div>
  );
}

function InvitePanel({
  onCreated,
}: {
  onCreated: (inv: PendingInvitation) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
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
      // Optimistically prepend; server revalidate will replace this row
      // with the canonical version on next render.
      onCreated({
        id: `temp-${Date.now()}`,
        email: trimmed.toLowerCase(),
        role,
        token: res.token!,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      });
      sileo.success({
        title: "Invite link ready",
        description: "Copy the link below and send it to your teammate.",
      });
      setEmail("");
    });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs">
      <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
        Invite a teammate
      </h3>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Generate a one-time invite link. Share it via Slack or email —
        when they sign in with this address, they&apos;ll be added to your
        team.
      </p>

      <div className="mt-4 flex items-center gap-2 max-md:flex-wrap">
        <input
          type="email"
          value={email}
          disabled={pending}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="teammate@yourcompany.com"
          className="focus-ring h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/40 disabled:opacity-60 max-md:basis-full"
        />
        <Popover>
          <PopoverTrigger className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent/40">
            {role === "admin" ? "Admin" : "Member"}
            <CaretDown size={10} weight="bold" className="opacity-60" />
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
        <Button
          onClick={submit}
          disabled={pending || !email.trim()}
          variant="default"
        >
          {pending ? (
            <CircleNotch size={13} className="animate-spin" />
          ) : (
            <PaperPlaneTilt size={13} />
          )}
          Generate link
        </Button>
      </div>
    </section>
  );
}

function PendingInvitesList({
  invites,
  onCancelled,
}: {
  invites: PendingInvitation[];
  onCancelled: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[14px] font-semibold tracking-tight text-foreground">
        Pending invites
        <span className="ml-2 text-[12px] font-normal tabular-nums text-muted-foreground">
          {invites.length}
        </span>
      </h3>
      <ul className="flex flex-col gap-2">
        {invites.map((inv) => (
          <li key={inv.id}>
            <PendingInviteRow invite={inv} onCancelled={onCancelled} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PendingInviteRow({
  invite,
  onCancelled,
}: {
  invite: PendingInvitation;
  onCancelled: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Built on the client so the link picks up the current origin
  // (preview deploys, localhost, prod all work without configuration).
  const inviteUrl =
    typeof window === "undefined"
      ? `/accept-invite/${invite.token}`
      : `${window.location.origin}/accept-invite/${invite.token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      sileo.error({ title: "Couldn't copy. Select the link and copy manually." });
    }
  };

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelInvite(invite.id);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      onCancelled(invite.id);
      sileo.success({ title: "Invite cancelled" });
    });

  const expiresIn = Math.max(
    0,
    Math.ceil(
      (new Date(invite.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000)
    )
  );

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft-xs">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <PaperPlaneTilt size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-foreground">
            {invite.email}
          </p>
          <p className="text-[11.5px] text-muted-foreground">
            {invite.role === "admin" ? "Admin" : "Member"} ·{" "}
            {expiresIn === 0
              ? "expires today"
              : expiresIn === 1
                ? "expires tomorrow"
                : `expires in ${expiresIn} days`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={cancel}
          disabled={pending}
          aria-label={`Cancel invite to ${invite.email}`}
          className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
        >
          {pending ? (
            <CircleNotch size={13} className="animate-spin" />
          ) : (
            <X size={13} weight="bold" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5">
        <code className="flex-1 truncate text-[11.5px] text-muted-foreground">
          {inviteUrl}
        </code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors",
            copied
              ? "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-card text-foreground hover:bg-accent/40"
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
              Copy link
            </>
          )}
        </button>
      </div>
    </article>
  );
}

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
      onClick={onSelect}
      className={cn(
        "focus-ring flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors",
        selected
          ? "bg-primary/8 text-primary"
          : "text-foreground hover:bg-accent/40"
      )}
    >
      <span className="text-[13px] font-medium">{label}</span>
      <span
        className={cn(
          "text-[11px]",
          selected ? "text-primary/70" : "text-muted-foreground"
        )}
      >
        {hint}
      </span>
    </button>
  );
}

function MemberList({ members }: { members: TeamMember[] }) {
  return (
    <section>
      <h3 className="mb-3 text-[14px] font-semibold tracking-tight text-foreground">
        Current members
      </h3>
      {members.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-card/40 px-4 py-10 text-center text-muted-foreground">
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <UsersThree size={18} />
          </span>
          <p className="mt-3 text-[13px]">Nobody here yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.id}>
              <MemberRow member={m} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const [pending, startTransition] = useTransition();
  const [optRole, setOptRole] = useState<"admin" | "member">(member.team_role);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setRole = (next: "admin" | "member") => {
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

  const remove = () => setConfirmOpen(true);
  const actuallyRemove = () => {
    startTransition(async () => {
      const res = await removeTeamMember(member.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.success({ title: `${member.name} removed` });
    });
  };

  return (
    <article className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft-xs">
      <Avatar
        src={member.avatar_url}
        initials={member.initials}
        color={member.avatar_color}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-foreground">
          {member.name}
        </p>
        {member.role && (
          <p className="truncate text-[11.5px] text-muted-foreground">
            {member.role}
          </p>
        )}
      </div>
      <Popover>
        <PopoverTrigger
          disabled={pending}
          className={cn(
            "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors disabled:opacity-50",
            optRole === "admin"
              ? "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {optRole === "admin" ? "Admin" : "Member"}
          <CaretDown size={9} weight="bold" className="opacity-70" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[170px] gap-0 p-1">
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
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={remove}
        disabled={pending}
        aria-label={`Remove ${member.name}`}
        className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
      >
        {pending ? (
          <CircleNotch size={13} className="animate-spin" />
        ) : (
          <Trash size={13} />
        )}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${member.name}?`}
        description={
          <>
            They&apos;ll lose access to this team and its tasks. You can
            invite them back any time.
          </>
        }
        confirmLabel="Remove"
        onConfirm={actuallyRemove}
      />
    </article>
  );
}
