"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { Plus } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createProject } from "@/lib/actions";

const QUICK_EMOJI = ["📋", "🚀", "✨", "🎨", "🔧", "📊", "💬", "🏢", "🎯", "🌱"];

/**
 * Inline "+" button next to the Projects header. Opens a small popover
 * with a name input and a quick emoji picker, calls createProject, and
 * navigates to the new project on success.
 */
export function AddProjectPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>("📋");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus the name input shortly after the popover mounts.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createProject(trimmed, emoji);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      sileo.success({ title: "Project created" });
      setName("");
      setEmoji("📋");
      setOpen(false);
      if (res.projectId) router.push(`/projects/${res.projectId}`);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="New project"
        className="focus-ring grid size-5 place-items-center rounded text-muted-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
      >
        <Plus size={12} weight="bold" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[260px] gap-0 p-3"
      >
        <p className="mb-2 text-[12px] font-semibold text-foreground">
          New project
        </p>
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger
              aria-label="Pick emoji"
              className="focus-ring grid size-8 shrink-0 place-items-center rounded-md border border-border bg-card text-[15px] transition-colors hover:bg-accent/40"
            >
              {emoji ?? "·"}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="w-[208px] gap-0 p-1.5"
            >
              <div className="grid grid-cols-5 gap-0.5">
                {QUICK_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className="focus-ring grid size-9 place-items-center rounded-md text-[16px] transition-colors hover:bg-accent/40"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Project name"
            disabled={pending}
            className="focus-ring h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || pending}
            className="focus-ring surface-brand surface-brand-hover inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
