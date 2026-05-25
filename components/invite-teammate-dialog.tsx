"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { sileo } from "sileo";
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  Copy,
  PaperPlaneTilt,
  X,
} from "@/components/icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { sendInvite } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/**
 * Modal version of the invite flow, used by the "Invite a teammate"
 * CTAs in the Inbox / Assigned-to-me / Upcoming empty states (and
 * anywhere else we want to keep the user on the current canvas
 * instead of jumping to /team/manage).
 *
 * Deliberately scoped to one job: generate a single invite link.
 * Pending-invite management (cancel, view all) lives on /team/manage
 * because it's a roster surface, not a quick action — we link to it
 * from the bottom of the dialog for users who want it.
 */
export function InviteTeammateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();
  // The generated link is owned by this component so it persists
  // until the user closes the dialog or generates another. On
  // close, the success-state snapshot resets.
  const [generated, setGenerated] = useState<{
    email: string;
    role: "admin" | "member";
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
      setGenerated(null);
      setCopied(false);
    }
  }, [open]);

  const submit = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await sendInvite(trimmed, role);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      playSound("added");
      setGenerated({ email: trimmed.toLowerCase(), role, token: res.token! });
    });
  };

  const inviteUrl =
    generated && typeof window !== "undefined"
      ? `${window.location.origin}/accept-invite/${generated.token}`
      : "";

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] gap-0 p-0 sm:max-w-[440px]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
          <span className="grid size-9 place-items-center rounded-lg bg-muted text-primary">
            <PaperPlaneTilt size={16} weight="regular" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold tracking-tight text-foreground">
              Invite a teammate
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              Generate a link, share it via Slack or email.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring touch-expand grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Body */}
        {generated ? (
          <Success
            email={generated.email}
            role={generated.role}
            inviteUrl={inviteUrl}
            copied={copied}
            onCopy={copy}
            onReset={() => {
              setGenerated(null);
              setEmail("");
            }}
          />
        ) : (
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="invite-email"
                className="text-[12px] font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                disabled={pending}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !pending && email.trim()) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="teammate@yourcompany.com"
                className="focus-ring h-9 rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/40 disabled:opacity-60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-foreground">
                Role
              </span>
              <Popover>
                <PopoverTrigger
                  disabled={pending}
                  className="focus-ring inline-flex h-9 items-center justify-between gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{role === "admin" ? "Admin" : "Member"}</span>
                  <CaretDown size={10} weight="bold" className="opacity-60" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--anchor-width)] min-w-[200px] gap-0 p-1"
                >
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
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
          <Link
            href="/team/manage"
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-md px-1 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Manage all invites
          </Link>
          {generated ? (
            <Button
              onClick={() => onOpenChange(false)}
              variant="cta"
              size="sm"
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={pending || !email.trim()}
              variant="cta"
              size="sm"
            >
              {pending ? (
                <CircleNotch size={13} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={13} />
              )}
              Generate link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Success({
  email,
  role,
  inviteUrl,
  copied,
  onCopy,
  onReset,
}: {
  email: string;
  role: "admin" | "member";
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="rounded-md border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
        <span className="font-medium">Link ready.</span> Send it to{" "}
        <span className="font-medium">{email}</span>. They&apos;ll join as{" "}
        {role === "admin" ? "an admin" : "a member"} once they sign in.
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5">
        <code className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
          {inviteUrl}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "focus-ring inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium transition-colors",
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
      <button
        type="button"
        onClick={onReset}
        className="focus-ring self-start rounded-md px-1 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        Invite someone else
      </button>
    </div>
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
      type="button"
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
