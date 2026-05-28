"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { CircleNotch } from "@/components/icons";
import { updateMyDepartment, updateMyProfile } from "@/lib/actions";
import { Avatar } from "@/components/avatar";

interface ProfileIdentityFormProps {
  initialName: string;
  initialRole: string | null;
  initialDepartment?: string | null;
  email: string | null;
  avatarColor: string;
  avatarUrl?: string | null;
  initials: string;
}

export function ProfileIdentityForm({
  initialName,
  initialRole,
  initialDepartment = null,
  email,
  avatarColor,
  avatarUrl,
  initials,
}: ProfileIdentityFormProps) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState(initialRole ?? "");
  const [department, setDepartment] = useState(initialDepartment ?? "");
  const [pending, startTransition] = useTransition();

  const dirty =
    name.trim() !== initialName.trim() ||
    (role.trim() || null) !== (initialRole ?? null) ||
    (department.trim() || null) !== (initialDepartment ?? null);

  const save = () => {
    if (!dirty || pending) return;
    startTransition(async () => {
      // Save name/role and department in parallel; one network turn.
      const [profileRes, deptRes] = await Promise.all([
        updateMyProfile({
          name: name.trim(),
          role: role.trim() || null,
        }),
        updateMyDepartment(department.trim() || null),
      ]);
      const err = profileRes.error ?? deptRes.error;
      if (err) sileo.error({ title: err });
      else sileo.success({ title: "Profile updated" });
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
      <div className="flex items-center gap-4 border-b border-border/40 p-5">
        <Avatar
          src={avatarUrl}
          initials={initials}
          color={avatarColor}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {name || "Unnamed"}
          </p>
          {email && (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <Field
          label="Display name"
          hint="Teammates see this on your tasks and across the workspace."
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="focus-ring w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring/40"
          />
        </Field>

        <Field
          label="Role"
          hint="Optional. Shows under your name in the sidebar."
        >
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Designer"
            className="focus-ring w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring/40"
          />
        </Field>

        <Field
          label="Department"
          hint="Optional. Groups you in the People directory (Design, Engineering...)."
        >
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Design"
            className="focus-ring w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-ring/40"
          />
        </Field>

        <div className="mt-1 flex items-center justify-end gap-2">
          {dirty && (
            <button
              onClick={() => {
                setName(initialName);
                setRole(initialRole ?? "");
                setDepartment(initialDepartment ?? "");
              }}
              disabled={pending}
              className="focus-ring rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || pending}
            className="focus-ring surface-brand surface-brand-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending && <CircleNotch size={13} className="animate-spin" />}
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Wrapping the input in a <label> binds them implicitly without
  // having to thread a generated id through the children — the
  // browser treats the wrapped form control as labelled by its
  // ancestor label automatically.
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}
