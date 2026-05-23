"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import {
  CaretDown,
  CircleNotch,
  Trash,
  UsersThree,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addTeamMember,
  changeTeamMemberRole,
  removeTeamMember,
} from "@/lib/actions";
import type { TeamMember } from "@/lib/queries";

export function ManageTeamUI({ members }: { members: TeamMember[] }) {
  return (
    <div className="flex flex-col gap-6">
      <InvitePanel />
      <MemberList members={members} />
    </div>
  );
}

function InvitePanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await addTeamMember(trimmed, role);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      sileo.success({ title: `Added to the team as ${role}` });
      setEmail("");
    });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs">
      <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
        Add a teammate
      </h3>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Add someone who already signed in to Loop. We&apos;ll give them the
        role you pick.
      </p>

      <div className="mt-4 flex items-center gap-2">
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
          className="focus-ring h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/40 disabled:opacity-60"
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
          {pending && <CircleNotch size={13} className="animate-spin" />}
          Add
        </Button>
      </div>
    </section>
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

  const remove = () => {
    const ok = window.confirm(
      `Remove ${member.name} from this team? They lose access to its tasks.`
    );
    if (!ok) return;
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
              ? "border-violet-200/70 bg-violet-50 text-violet-700"
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
        className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
      >
        {pending ? (
          <CircleNotch size={13} className="animate-spin" />
        ) : (
          <Trash size={13} />
        )}
      </Button>
    </article>
  );
}

