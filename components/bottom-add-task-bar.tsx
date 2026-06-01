"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { sileo } from "sileo";
import { deriveTaskDefaults } from "@/lib/task-defaults";
import {
  ArrowsClockwise,
  ArrowUp,
  CalendarBlank,
  CircleNotch,
  FileDoc,
  FileHtml,
  FilePdf,
  Flag,
  Folder,
  Image as ImageIcon,
  LinkSimple,
  Paperclip,
  Plus,
  User,
  X,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  createTask,
  addTaskAttachmentFile,
  addTaskAttachmentLink,
} from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { parseTask, type ParseHint } from "@/lib/parse-task";
import { compressImage } from "@/lib/compress-image";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { projectColor } from "@/components/project-dot";
import { formatDueShort } from "@/components/date-picker";
import type { Profile, Project } from "@/lib/queries";

/**
 * A pill-shaped composer pinned to the bottom of the viewport, centered
 * over the canvas. Same shadow + radius vocabulary as the search
 * palette so the two centered surfaces feel like a pair: search at the
 * top of intent (find), add-task at the bottom of intent (create).
 *
 * Natural-language aware: the same parser the modal quick-add uses
 * runs on every keystroke. Type "review designs tomorrow p1" and the
 * task lands with due-tomorrow + High priority, the parsed tokens
 * stripped from the title. Detected tokens surface as a small hint
 * row above the bar so users discover the syntax without a tutorial.
 *
 * Context-aware: the placeholder + the data we send to createTask
 * change with the current route, so a task typed on My Day lands with
 * a due-today date, a task typed on a project page lands in that
 * project, and so on. Manual context wins unless the parser overrides
 * it (parser tokens reflect what you literally typed).
 *
 * Desktop only. Mobile already has the FAB + bottom nav.
 */

interface Context {
  dueAt: string | null;
  assigneeId: string;
  projectId: string | null;
  placeholder: string;
}

// The data defaults (dueAt, projectId) come from the shared
// deriveTaskDefaults so this bar and the quick-add modal never disagree.
// Only the placeholder copy is bar-specific.
function placeholderFor(pathname: string): string {
  if (pathname === "/inbox") return "Add to Inbox. Try “@maya draft post #blog”";
  if (pathname === "/upcoming")
    return "Add an upcoming task. Try “sync meeting next week”";
  if (pathname.startsWith("/projects/"))
    return "Add a task. Try “ship hero copy friday”";
  return "Add a task. Try “review designs tomorrow p1”";
}

function deriveContext(pathname: string, currentUserId: string): Context {
  const { dueAt, projectId } = deriveTaskDefaults(pathname);
  return {
    dueAt,
    assigneeId: currentUserId,
    projectId,
    placeholder: placeholderFor(pathname),
  };
}

// Staged attachment. Either a real File (will need to be uploaded to
// Supabase storage once that pipeline lands) or a Link (just a URL the
// task carries — zero storage cost, the recommended path on free tier).
type StagedAttachment =
  | { kind: "file"; file: File }
  | { kind: "link"; url: string; label: string };

export function BottomAddTaskBar({
  currentUserId,
  projects,
  members,
}: {
  currentUserId: string;
  projects: Project[];
  members: Profile[];
}) {
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [attachment, setAttachment] = useState<StagedAttachment | null>(null);
  // Attach popover sub-mode. "menu" = type picker, "link" = URL input.
  const [attachMode, setAttachMode] = useState<"menu" | "link">("menu");
  const [attachOpen, setAttachOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  // One shared file input — the chosen accept filter is set right
  // before .click() so a single hidden element serves every menu
  // option (image / pdf / document / html / any).
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
  const pickFile = (accept: string) => {
    setAttachOpen(false);
    const el = fileInputRef.current;
    if (!el) return;
    el.value = "";
    el.accept = accept;
    el.click();
  };
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      sileo.error({
        title: "File too large",
        description: "Uploads are capped at 5 MB. Paste a link for anything larger.",
      });
      return;
    }
    setAttachment({ kind: "file", file });
  };
  const submitLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    // Be permissive — if the user pastes "drive.google.com/..." without
    // a scheme, prepend https:// so the URL constructor accepts it.
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let label = normalized;
    try {
      label = new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      sileo.error({ title: "That doesn't look like a URL" });
      return;
    }
    setAttachment({ kind: "link", url: normalized, label });
    setLinkUrl("");
    setAttachMode("menu");
    setAttachOpen(false);
  };

  // Live parse on every keystroke. Cheap (string regexes), and the
  // memo only re-runs when one of the three inputs changes. Declared
  // unconditionally — hook order has to be stable across renders, so
  // the route check that hides the bar happens *after* hook calls.
  const parsed = useMemo(
    () => parseTask(value, { projects, members }),
    [value, projects, members]
  );

  // Skip the bar on Completed (and any auth/setup routes that wouldn't
  // accept a new task). pathname === null protects against the brief
  // server-render window before usePathname resolves.
  if (!pathname || pathname === "/completed") return null;

  const ctx = deriveContext(pathname, currentUserId);

  const submit = () => {
    const rawTitle = value.trim();
    if (!rawTitle || pending) return;

    // Parser-stripped title is what we save. Fall back to the raw
    // input if the parser ate everything (user typed only tokens).
    const finalTitle = parsed.title.trim() || rawTitle;

    // Parser-resolved fields override the page context. What you
    // literally typed wins over the implicit context. e.g. typing
    // "tomorrow" on My Day pushes the due date to tomorrow, not today.
    const dueAt =
      parsed.dueAt !== null ? parsed.dueAt.toISOString() : ctx.dueAt;
    const assigneeId = parsed.assigneeId ?? ctx.assigneeId;
    const projectId = parsed.projectId ?? ctx.projectId;
    const priority = parsed.priority ?? undefined;
    const recurrence = parsed.recurrence;

    const stagedAttachment = attachment;
    setValue("");
    setAttachment(null);
    playSound("added");
    startTransition(async () => {
      const res = await createTask({
        title: finalTitle,
        dueAt,
        assigneeId,
        projectId,
        priority,
        recurrence,
      });
      if (res.error || !res.taskId) {
        sileo.error({ title: res.error ?? "Couldn't create task" });
        setValue(rawTitle);
        if (stagedAttachment) setAttachment(stagedAttachment);
        return;
      }

      // Task is in. If there was a staged attachment, persist it now.
      // The DB write (link) or storage upload + DB write (file) runs
      // after the task is created so the attachment can foreign-key
      // its task. Errors here surface in the toast but the task is
      // already saved.
      if (stagedAttachment) {
        const attachErr = await persistAttachment(res.taskId, stagedAttachment);
        if (attachErr) {
          sileo.error({
            title: "Task saved, but attachment failed",
            description: attachErr,
          });
          return;
        }
        sileo.success({
          title: "Task added",
          description:
            stagedAttachment.kind === "file"
              ? `${stagedAttachment.file.name} attached.`
              : `Link to ${stagedAttachment.label} attached.`,
        });
      }
    });
    inputRef.current?.focus();
  };

  /**
   * Upload (if file) and record an attachment row for the just-created
   * task. Returns null on success, an error string on failure. Image
   * attachments run through compressImage first; non-image files upload
   * as-is up to the 5 MB cap.
   */
  async function persistAttachment(
    taskId: string,
    a: StagedAttachment
  ): Promise<string | null> {
    if (a.kind === "link") {
      const res = await addTaskAttachmentLink(taskId, a.url, a.label);
      return res.error ?? null;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase not configured.";

    // Images get compressed client-side. Non-images upload as-is.
    const isImage = a.file.type.startsWith("image/");
    const compressed = isImage
      ? await compressImage(a.file)
      : {
          blob: a.file,
          extension: a.file.name.split(".").pop() ?? "bin",
          contentType: a.file.type || "application/octet-stream",
          compressed: false,
        };

    // Storage path: {taskId}/{timestamp}-{rand}.{ext}. Bucket-level RLS
    // already restricts inserts to authenticated users; the per-task
    // prefix keeps things organized for the future cleanup job.
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${taskId}/${Date.now()}-${rand}.${compressed.extension}`;

    const up = await supabase.storage
      .from("task-attachments")
      .upload(path, compressed.blob, {
        contentType: compressed.contentType,
        cacheControl: "31536000",
      });
    if (up.error) return up.error.message;

    const res = await addTaskAttachmentFile(taskId, {
      storagePath: path,
      label: a.file.name,
      contentType: compressed.contentType,
      sizeBytes: compressed.blob.size,
    });
    return res.error ?? null;
  }

  const canSubmit = value.trim().length > 0 && !pending;
  const showHints = parsed.hints.length > 0;
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="pointer-events-none fixed bottom-6 z-30 hidden flex-col items-center px-4 transition-[left,right] duration-300 ease-[var(--ease-out)] md:flex"
      style={{
        left: "var(--sidebar-w, 248px)",
        right: "var(--notif-w, 0px)",
      }}
    >
      {/* Parse hints: appear above the bar when the parser detected
          a token. Same chip vocabulary as the drawer details, scaled
          down. Doubles as silent syntax tutorial: backspace and they
          disappear. */}
      {(showHints || attachment) && (
        <div className="pointer-events-auto mb-2 flex flex-wrap items-center justify-center gap-1.5">
          {parsed.hints.map((h, i) => (
            <HintChip
              key={`${h.kind}-${i}`}
              hint={h}
              projects={projects}
              members={members}
              parsedProjectId={parsed.projectId}
              parsedAssigneeId={parsed.assigneeId}
              parsedDueAt={parsed.dueAt}
            />
          ))}
          {attachment && (
            <span className="chip-3d inline-flex h-6 items-center gap-1.5 rounded-sm bg-popover px-2 text-[11px] font-medium text-foreground ring-1 ring-inset ring-border/60 shadow-[var(--shadow-soft-xs)]">
              {attachment.kind === "file" ? (
                <Paperclip size={11} weight="fill" className="text-primary" />
              ) : (
                <LinkSimple size={11} weight="bold" className="text-primary" />
              )}
              <span className="max-w-[160px] truncate">
                {attachment.kind === "file" ? attachment.file.name : attachment.label}
              </span>
              {attachment.kind === "file" && (
                <span className="text-muted-foreground tabular-nums">
                  {formatBytes(attachment.file.size)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="focus-ring -mr-0.5 grid size-4 place-items-center rounded text-muted-foreground/70 hover:text-foreground"
              >
                <X size={10} weight="bold" />
              </button>
            </span>
          )}
        </div>
      )}

      <motion.div
        // No filter-based animation here: `filter: blur()` forces the
        // browser onto a non-composited paint path (Lighthouse flags it
        // as a perf cost). Stick to transform + opacity, both of which
        // are GPU-composited cheaply.
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[640px]"
      >
        {/* Two halo layers behind the pill. The blue wash gives it
            personality (and stops the bar reading as white-on-white);
            the neutral shadow halo is what actually lifts it off the
            page. Both pointer-events-none + -z-10 so they're purely
            visual. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-28 -inset-y-20 -z-10 rounded-[80px] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_10%,transparent)_0%,color-mix(in_oklch,var(--primary)_4%,transparent)_45%,transparent_72%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -inset-y-7 -z-10 rounded-[60px] bg-[radial-gradient(ellipse_at_center,oklch(0_0_0/0.08)_0%,oklch(0_0_0/0.03)_55%,transparent_75%)] blur-xl dark:bg-[radial-gradient(ellipse_at_center,oklch(0_0_0/0.5)_0%,oklch(0_0_0/0.2)_55%,transparent_75%)]"
        />
      <div className="pointer-events-auto flex w-full max-w-[640px] items-center gap-3 rounded-[28px] border-0 bg-popover px-6 py-3.5 shadow-[0_24px_80px_-12px_oklch(0.25_0.06_265_/_0.22),0_8px_24px_-6px_oklch(0.25_0.06_265_/_0.08),0_0_0_1px_oklch(0.25_0.06_265_/_0.04)]">
        {/* + button: opens an attachment-type popover. Each option
            triggers the hidden file input with a matching accept
            filter. Selected files are capped at 5 MB; bigger files
            surface an error toast and don't attach. */}
        <Popover
          open={attachOpen}
          onOpenChange={(o) => {
            setAttachOpen(o);
            if (!o) setAttachMode("menu");
            if (o && attachMode === "link") {
              setTimeout(() => linkInputRef.current?.focus(), 30);
            }
          }}
        >
          <PopoverTrigger
            aria-label="Attach a file or link"
            className="focus-ring grid size-6 shrink-0 place-items-center rounded text-muted-foreground/80 transition-colors hover:text-foreground data-[popup-open]:text-primary"
          >
            <Plus size={18} weight="bold" />
          </PopoverTrigger>
          <PopoverContent side="top" align="start" sideOffset={10} className="w-[220px]">
            {attachMode === "menu" ? (
              <>
                {/* Group 1 — Link. Listed first because pasting a URL
                    costs zero storage. Best path on the free tier. */}
                <AttachOption
                  icon={<LinkSimple size={15} className="text-muted-foreground" />}
                  label="Link from URL"
                  hint="No upload"
                  onClick={() => {
                    setAttachMode("link");
                    setTimeout(() => linkInputRef.current?.focus(), 30);
                  }}
                />

                <div className="my-1 h-px bg-border/60" />

                {/* Group 2 — Upload. One file, 5 MB cap. Icons
                    distinct per type so the row reads at a glance. */}
                <AttachOption
                  icon={<ImageIcon size={15} className="text-muted-foreground" />}
                  label="Image"
                  onClick={() => pickFile("image/*")}
                />
                <AttachOption
                  icon={<FilePdf size={15} className="text-muted-foreground" />}
                  label="PDF"
                  onClick={() => pickFile("application/pdf")}
                />
                <AttachOption
                  icon={<FileDoc size={15} className="text-muted-foreground" />}
                  label="Document"
                  onClick={() =>
                    pickFile(
                      ".doc,.docx,.txt,.md,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
                  }
                />
                <AttachOption
                  icon={<FileHtml size={15} className="text-muted-foreground" />}
                  label="HTML file"
                  onClick={() => pickFile("text/html,.html,.htm")}
                />
                <AttachOption
                  icon={<Paperclip size={15} className="text-muted-foreground" />}
                  label="Any file"
                  onClick={() => pickFile("*/*")}
                />

                <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground/70">
                  5 MB max per upload. For bigger files, paste a Drive
                  or Dropbox link.
                </p>
              </>
            ) : (
              <div className="p-1">
                <p className="px-2 pb-2 pt-1 text-[12px] font-medium text-foreground">
                  Paste a URL
                </p>
                <input
                  ref={linkInputRef}
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitLink();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setLinkUrl("");
                      setAttachMode("menu");
                    }
                  }}
                  placeholder="https://drive.google.com/..."
                  className="focus-ring h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/55"
                />
                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLinkUrl("");
                      setAttachMode("menu");
                    }}
                    className="focus-ring rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitLink}
                    disabled={!linkUrl.trim()}
                    className={cn(
                      "focus-ring rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      linkUrl.trim()
                        ? "bg-primary text-primary-foreground hover:brightness-110"
                        : "cursor-not-allowed bg-muted text-muted-foreground"
                    )}
                  >
                    Attach
                  </button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileChosen}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={ctx.placeholder}
          aria-label="Add a task"
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/55"
        />
        {/* Arrow chip: lights up primary as soon as there's content,
            so users get instant feedback that Enter (or click) will
            fire. Muted/inert when the input is empty. */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Add task"
          className={cn(
            "focus-ring grid size-7 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-95",
            canSubmit
              ? "bg-primary text-primary-foreground shadow-[var(--shadow-cta)] hover:brightness-110"
              : "bg-muted/60 text-muted-foreground/60"
          )}
        >
          {pending ? (
            <CircleNotch size={13} className="animate-spin" />
          ) : (
            <ArrowUp size={13} weight="bold" />
          )}
        </button>
      </div>
      </motion.div>
    </div>
  );
}

/**
 * Single row in the + attachment popover. Icon + label, fires the
 * caller-provided file picker on click. Same per-item spacing as the
 * harmonized PopoverItem used everywhere else (px-3 py-2.5 text-[13px]).
 */
function AttachOption({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  /** Small right-aligned tag (e.g. "No upload" for the Link option). */
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04]"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="text-[10px] font-medium text-muted-foreground/70">
          {hint}
        </span>
      )}
    </button>
  );
}

function HintChip({
  hint,
  projects,
  members,
  parsedProjectId,
  parsedAssigneeId,
  parsedDueAt,
}: {
  hint: ParseHint;
  projects: Project[];
  members: Profile[];
  parsedProjectId: string | null;
  parsedAssigneeId: string | null;
  parsedDueAt: Date | null;
}) {
  // Pick the right glyph + label for each parsed token type. All
  // share the same compact pill chrome so the row reads as one set.
  const base =
    "chip-3d inline-flex h-6 items-center gap-1 rounded-sm bg-popover px-2 text-[11px] font-medium ring-1 ring-inset ring-border/60 shadow-[var(--shadow-soft-xs)]";

  if (hint.kind === "project") {
    const proj = projects.find((p) => p.id === parsedProjectId);
    return (
      <span className={`${base} text-foreground`}>
        <Folder
          size={11}
          weight="fill"
          style={{ color: proj ? projectColor(proj) : undefined }}
        />
        <span>{proj ? proj.name : hint.label}</span>
      </span>
    );
  }
  if (hint.kind === "assignee") {
    const m = members.find((mm) => mm.id === parsedAssigneeId);
    return (
      <span className={`${base} text-foreground`}>
        <User size={11} />
        <span>{m ? m.name.split(/\s+/)[0] : hint.label}</span>
      </span>
    );
  }
  if (hint.kind === "due") {
    const label = parsedDueAt ? formatDueShort(parsedDueAt) : hint.label;
    return (
      <span className={`${base} text-rose-700 ring-rose-500/25 dark:text-rose-200 dark:ring-rose-400/30`}>
        <CalendarBlank size={11} weight="fill" />
        <span className="tabular-nums">{label}</span>
      </span>
    );
  }
  if (hint.kind === "recurrence") {
    return (
      <span className={`${base} text-primary ring-primary/30`}>
        <ArrowsClockwise size={11} weight="bold" />
        <span>{hint.label}</span>
      </span>
    );
  }
  // priority
  const priorityTone =
    hint.label === "P1"
      ? "text-rose-700 ring-rose-500/25 dark:text-rose-200 dark:ring-rose-400/30"
      : hint.label === "P2"
        ? "text-amber-700 ring-amber-500/30 dark:text-amber-200 dark:ring-amber-400/30"
        : hint.label === "P3"
          ? "text-emerald-700 ring-emerald-500/25 dark:text-emerald-200 dark:ring-emerald-400/30"
          : "text-muted-foreground";
  return (
    <span className={`${base} ${priorityTone}`}>
      <Flag size={11} weight="fill" />
      <span>{hint.label}</span>
    </span>
  );
}
