"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarBlank,
  Check,
  CircleNotch,
  Flag,
  Folder,
  Plus,
  UserPlus,
  X,
} from "@/components/icons";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { DatePicker, formatDueShort } from "@/components/date-picker";
import { Avatar } from "@/components/avatar";
import type { Profile, Project } from "@/lib/queries";

type Priority = 1 | 2 | 3 | 4;

export interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: Project[];
  members: Profile[];
  currentUserId: string;
}

const PRIORITY_OPTIONS: { p: Priority; label: string; cls: string }[] = [
  { p: 1, label: "High", cls: "text-rose-500" },
  { p: 2, label: "Medium", cls: "text-amber-500" },
  { p: 3, label: "Low", cls: "text-emerald-500" },
  { p: 4, label: "None", cls: "text-muted-foreground/50" },
];

const chipClass =
  "focus-ring flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.97]";

export function QuickAddDialog({
  open,
  onOpenChange,
  projects,
  members,
  currentUserId,
}: QuickAddDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState<Date | null>(null);
  const [priority, setPriority] = useState<Priority>(4);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDue(null);
      setPriority(4);
      setProjectId(null);
      setAssigneeId(currentUserId);
    }
  }, [open, currentUserId]);

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTask({
        title,
        description: description || undefined,
        priority,
        dueAt: due ? due.toISOString() : null,
        projectId,
        assigneeId,
      });
      if (res.error) {
        playSound("error");
        sileo.error({ title: res.error });
        return;
      }
      playSound("added");
      const target = members.find((m) => m.id === assigneeId);
      sileo.success({
        title:
          assigneeId !== currentUserId && target
            ? `Assigned to ${target.name}`
            : "Task added",
      });
      onOpenChange(false);
    });
  };

  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.p === priority)!;
  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const assignee = members.find((m) => m.id === assigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl gap-0 border-border/60 p-0 shadow-soft-xl sm:rounded-2xl"
      >
        {/* ElevenLabs-style header */}
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <span className="surface-brand grid size-7 place-items-center rounded-md text-white shadow-[var(--shadow-brand-tile)]">
            <Plus size={16} weight="bold" />
          </span>
          <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
            Add task
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.94]"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-4 pb-3 pt-3">
          <label htmlFor="quick-add-title" className="sr-only">
            Task name
          </label>
          <input
            id="quick-add-title"
            autoFocus
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <label htmlFor="quick-add-description" className="sr-only">
            Description (optional)
          </label>
          <input
            id="quick-add-description"
            placeholder="Add a note (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full bg-transparent text-[13px] text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Popover>
              <PopoverTrigger className={chipClass}>
                <CalendarBlank size={14} />
                {formatDueShort(due)}
              </PopoverTrigger>
              <PopoverContent className="gap-0 p-0" align="start">
                <DatePicker value={due} onChange={setDue} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger className={chipClass}>
                <Flag size={14} className={priorityOpt.cls} weight="fill" />
                {priority === 4 ? "Priority" : priorityOpt.label}
              </PopoverTrigger>
              <PopoverContent className="w-[180px] gap-0 p-1" align="start">
                {PRIORITY_OPTIONS.map((o) => (
                  <PopoverItem
                    key={o.p}
                    selected={priority === o.p}
                    onSelect={() => setPriority(o.p)}
                  >
                    <Flag
                      size={14}
                      className={o.cls}
                      weight={o.p === 4 ? "regular" : "fill"}
                    />
                    <span>{o.label}</span>
                  </PopoverItem>
                ))}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger className={chipClass}>
                <UserPlus size={14} />
                {assigneeId === currentUserId
                  ? "Me"
                  : assignee?.name ?? "Assign"}
              </PopoverTrigger>
              <PopoverContent className="w-[220px] gap-0 p-1" align="start">
                {members.length === 0 ? (
                  <p className="px-2 py-1 text-[12px] text-muted-foreground">
                    Just you in here for now.
                  </p>
                ) : (
                  members.map((m) => (
                    <PopoverItem
                      key={m.id}
                      selected={assigneeId === m.id}
                      onSelect={() => setAssigneeId(m.id)}
                    >
                      <Avatar
                        src={m.avatar_url}
                        initials={m.initials}
                        color={m.avatar_color}
                        size={18}
                      />
                      <span>
                        {m.name}
                        {m.id === currentUserId ? " (me)" : ""}
                      </span>
                    </PopoverItem>
                  ))
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/40 px-4 py-3">
          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.97]">
              <Folder size={14} />
              {project ? (
                <>
                  {project.emoji ? `${project.emoji} ` : "# "}
                  {project.name}
                </>
              ) : (
                "Inbox"
              )}
            </PopoverTrigger>
            <PopoverContent className="w-[240px] gap-0 p-1" align="start">
              <PopoverItem
                selected={projectId === null}
                onSelect={() => setProjectId(null)}
              >
                <Folder size={14} className="text-muted-foreground" />
                <span>Inbox (no project)</span>
              </PopoverItem>
              {projects.map((p) => (
                <PopoverItem
                  key={p.id}
                  selected={projectId === p.id}
                  onSelect={() => setProjectId(p.id)}
                >
                  <span className="text-muted-foreground">
                    {p.emoji ?? "#"}
                  </span>
                  <span className="truncate">{p.name}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={pending || !title.trim()}
              className="focus-ring surface-brand surface-brand-hover flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {pending && <CircleNotch size={14} className="animate-spin" />}
              {pending ? "Adding…" : "Add task"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PopoverItem({
  children,
  selected,
  onSelect,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-accent",
        selected && "bg-accent font-medium"
      )}
    >
      {children}
      {selected && <Check size={14} className="ml-auto text-primary" />}
    </button>
  );
}
