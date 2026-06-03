import type { Metadata } from "next";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "System map · Loop",
  description:
    "Loop's architecture, data model, and information architecture — one page.",
};

/* ============================================================================
   /flows — Loop's system map.

   Three diagrams, hand-built in Loop's own design language (cool blue-grey
   tokens, single brand-blue accent, layered cards, monospace for identifiers):

     01  System architecture — Client / Next.js 16 / Supabase, with data flow
     02  Data model          — domain-grouped tables + the relationships + RLS
     03  Information arch.    — every route, grouped the way the nav presents it

   Static server component. Motion is CSS-only (tw-animate-css staggered
   reveals); everything reads in light and dark via the theme tokens.
   ========================================================================== */

// ── Small presentational primitives ────────────────────────────────────────

function Mono({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "font-mono text-[12.5px] font-semibold text-foreground",
        className
      )}
    >
      {children}
    </code>
  );
}

function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  index,
  kicker,
  title,
  blurb,
}: {
  index: string;
  kicker: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="mb-7 flex items-start gap-4">
      <span className="mt-1 font-mono text-[13px] font-bold tabular-nums text-primary-readable">
        {index}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {kicker}
        </p>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-[680px] text-[14px] leading-relaxed text-muted-foreground">
          {blurb}
        </p>
      </div>
    </div>
  );
}

// Canvas — the framed surface a diagram sits on, with a faint blueprint grid.
function Canvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4 shadow-soft-sm sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 30%, black, transparent 80%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// ── 01 · Architecture primitives ────────────────────────────────────────────

function LayerCard({
  tag,
  title,
  dot,
  children,
}: {
  tag: string;
  title: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft-xs sm:p-5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className={cn("inline-block size-2.5 rounded-full", dot)} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {tag}
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Node({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/55 bg-background/70 px-3 py-2">
      <p className="font-mono text-[12px] font-semibold text-foreground">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

function FlowRow({ dir, labels }: { dir: "down" | "up"; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="select-none font-mono text-[12px] text-primary/60">
        {dir === "down" ? "↓" : "↑"}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {labels.map((l) => (
          <span
            key={l}
            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary-readable ring-1 ring-inset ring-primary/15"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// Bidirectional flow strip between two layers.
function FlowStrip({ down, up }: { down: string[]; up: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <FlowRow dir="down" labels={down} />
      <FlowRow dir="up" labels={up} />
    </div>
  );
}

// ── 02 · Data-model primitives ──────────────────────────────────────────────

function Entity({
  name,
  hub,
  desc,
  rel,
}: {
  name: string;
  hub?: boolean;
  desc: string;
  rel?: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/60 px-3 py-2.5",
        hub
          ? "border-primary/35 ring-1 ring-inset ring-primary/15"
          : "border-border/55"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Mono>{name}</Mono>
        {hub && (
          <span className="rounded-full bg-primary/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary-readable">
            hub
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        {desc}
      </p>
      {rel && rel.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {rel.map((r) => (
            <span
              key={r}
              className="font-mono text-[10px] text-muted-foreground/75"
            >
              → {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  color,
  wide,
  children,
}: {
  label: string;
  color: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs",
        wide && "sm:col-span-2 lg:col-span-3"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("inline-block h-3.5 w-1 rounded-full", color)} />
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground/80">
          {label}
        </h3>
      </div>
      <div
        className={cn(
          wide ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── 03 · IA primitives ──────────────────────────────────────────────────────

function Route({
  path,
  desc,
  tag,
}: {
  path: string;
  desc: string;
  tag?: string;
}) {
  return (
    <div className="rounded-md border border-transparent px-2.5 py-1.5 transition-colors hover:border-border/50 hover:bg-accent/30">
      <div className="flex items-center gap-2">
        <Mono className="text-[12px]">{path}</Mono>
        {tag && (
          <span className="rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary-readable">
            {tag}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-soft-xs">
      <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-foreground/85 shadow-soft-xs">
      {children}
    </span>
  );
}

// ── 04 · User-flow primitives ───────────────────────────────────────────────

type StepDef = { label: string; sub?: string; tone?: "default" | "accent" };
type JourneyDef = {
  tag: string;
  title: string;
  steps: StepDef[];
  note?: string;
};

function FlowStep({ label, sub, tone = "default" }: StepDef) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 shadow-soft-xs",
        tone === "accent"
          ? "border-primary/30 bg-primary/[0.06]"
          : "border-border/60 bg-background/70"
      )}
    >
      <p className="font-mono text-[11.5px] font-semibold leading-tight text-foreground">
        {label}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <span
      aria-hidden
      className="select-none self-center px-0.5 font-mono text-[13px] text-primary/45"
    >
      →
    </span>
  );
}

function Journey({ tag, title, steps, note }: JourneyDef) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-primary-readable">
          {tag}
        </span>
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h3>
      </div>
      <div className="flex flex-wrap items-stretch gap-x-1 gap-y-2">
        {steps.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <FlowArrow />}
            <FlowStep {...s} />
          </Fragment>
        ))}
      </div>
      {note && (
        <p className="mt-3 flex items-start gap-1.5 border-t border-border/40 pt-2.5 text-[11px] leading-snug text-muted-foreground">
          <span className="mt-px font-mono text-[11px] text-primary/60">↳</span>
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

const JOURNEYS: JourneyDef[] = [
  {
    tag: "Enter",
    title: "Sign in & onboard",
    steps: [
      { label: "Land · /" },
      { label: "Sign in", sub: "Google · magic link" },
      { label: "Session", sub: "/auth/callback" },
      { label: "My work", sub: "/assigned-to-me", tone: "accent" },
    ],
    note: "First run with no team → /onboarding (create a team, pick a role) → My work. Returning users skip straight in.",
  },
  {
    tag: "Capture",
    title: "Add & assign a task",
    steps: [
      { label: "⌘K · Quick add" },
      { label: "Assignee · due · project" },
      { label: "createTask()", sub: "server action" },
      { label: "Lands in queues", tone: "accent" },
      { label: "Assignee notified" },
    ],
    note: "No project → it sits in Inbox for triage. Assignment fires a realtime notification + toast to each assignee.",
  },
  {
    tag: "Triage",
    title: "Clear the inbox",
    steps: [
      { label: "/inbox" },
      { label: "Open task drawer" },
      { label: "Set project · due · assignee" },
      { label: "Triaged", tone: "accent" },
    ],
    note: "Triaged tasks leave the inbox and flow into the right project + date queues.",
  },
  {
    tag: "Do",
    title: "Work a task to done",
    steps: [
      { label: "My Day / Assigned" },
      { label: "Open drawer" },
      { label: "Comment · subtasks · files" },
      { label: "Mark complete", tone: "accent" },
    ],
    note: "Team task → status becomes in_review (awaits a manager). Personal task → done immediately.",
  },
  {
    tag: "Approve",
    title: "Manager sign-off loop",
    steps: [
      { label: "Task in_review" },
      { label: "/approvals", sub: "manager · superadmin" },
      { label: "Approve → done", tone: "accent" },
    ],
    note: "Or send it back with a note → posts a comment → returns to the assignee to revise (the loop repeats).",
  },
  {
    tag: "Collaborate",
    title: "Comment → notify",
    steps: [
      { label: "Comment / @mention" },
      { label: "Trigger writes notification" },
      { label: "Realtime push" },
      { label: "Toast + bell", tone: "accent" },
      { label: "Recipient opens task" },
    ],
    note: "Mentions, replies, assignments, completions and reschedules all fan out the same way.",
  },
  {
    tag: "Grow",
    title: "Invite a teammate",
    steps: [
      { label: "Admin invites", sub: "email + role" },
      { label: "Share link · token" },
      { label: "/accept-invite/[token]" },
      { label: "Joins the team", tone: "accent" },
    ],
    note: "Token-based, 14-day expiry; accepting adds them to team_members and lands them in My work.",
  },
  {
    tag: "Oversee",
    title: "Admin & superadmin",
    steps: [
      { label: "Profile menu" },
      { label: "/admin", sub: "superadmin only" },
      { label: "Grant roles · set managers", tone: "accent" },
    ],
    note: "Workspace admins manage the roster at /workspace/manage; superadmins also manage company-wide roles + each team's approvers.",
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function FlowsPage() {
  return (
    <main className="relative mx-auto w-full max-w-[1180px] px-5 pb-32 pt-16 sm:px-8 sm:pt-20 lg:px-12">
      {/* Hero */}
      <Reveal>
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-primary-readable">
          Loop · system map
        </p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px]">
          How Loop is wired,
          <br className="hidden sm:block" /> end to end.
        </h1>
        <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
          The architecture, the data model, and the information architecture —
          drawn from the codebase as it actually stands. A content-first task
          tracker built on Next.js 16 (App Router, RSC) and Supabase, where
          row-level security is the real access boundary.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "Next.js 16 · App Router",
            "React 19 · RSC",
            "Supabase · Postgres · Auth · Realtime · Storage",
            "RLS-enforced",
          ].map((t) => (
            <span
              key={t}
              className="chip-3d rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border/60"
            >
              {t}
            </span>
          ))}
        </div>
      </Reveal>

      {/* ── 01 · System architecture ───────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="01"
            kicker="Architecture"
            title="Three layers, one request loop"
            blurb="The browser renders RSC output and runs a stack of context providers. The Next.js server authenticates every request, fetches through cached queries, and mutates through server actions. Supabase is the source of truth — Postgres with RLS, Auth, Realtime, and Storage. Reads and writes are always RLS-scoped; live changes are pushed back over websockets."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            <LayerCard tag="Client" title="Browser" dot="bg-primary">
              <Node title="RSC output" sub="streamed server-rendered UI" />
              <Node
                title="Providers"
                sub="Theme · Team · Notifications · Sidebar · QuickAdd · AppControls · Tooltip"
              />
              <Node title="AppShell" sub="code-splits the heavy modals" />
              <Node title="Client components" sub="task rows, drawers, dialogs" />
              <Node
                title="RealtimeBridge"
                sub="subscribes to Postgres changes"
              />
              <Node title="sileo · @web-kits/audio" sub="toasts + sounds" />
            </LayerCard>

            <FlowStrip
              down={["HTTP request → proxy refreshes session", "server actions (mutations)"]}
              up={["RSC stream · revalidatePath()"]}
            />

            <LayerCard
              tag="Server"
              title="Next.js 16"
              dot="bg-foreground/60"
            >
              <Node
                title="proxy.ts"
                sub="auth middleware · session refresh · route gating"
              />
              <Node
                title="(app)/layout.tsx"
                sub="auth gate · fetches profile, team, projects, counts"
              />
              <Node title="RSC pages" sub="app/(app)/*  ·  app/*" />
              <Node
                title="lib/queries.ts"
                sub="cached reads · getSupabaseServer()"
              />
              <Node
                title="lib/actions.ts"
                sub="'use server' mutations · RPCs · revalidatePath"
              />
              <Node title="route handlers" sub="auth/callback (code → session)" />
            </LayerCard>

            <FlowStrip
              down={[
                "RLS-scoped SELECT (reads)",
                "INSERT / UPDATE + SECURITY DEFINER RPCs (writes)",
                "auth code ↔ session",
              ]}
              up={["rows (RLS-filtered)", "trigger side-effects"]}
            />

            <LayerCard tag="Backend" title="Supabase" dot="bg-emerald-500">
              <Node
                title="Auth"
                sub="Google OAuth · magic link · cookie session"
              />
              <Node
                title="Postgres + RLS"
                sub="policies · app_private SECURITY DEFINER helpers · triggers"
              />
              <Node
                title="Realtime"
                sub="tasks · notifications · comments · reactions · assignees"
              />
              <Node
                title="Storage"
                sub="task-attachments bucket (public read)"
              />
            </LayerCard>

            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2 text-center">
              <span className="font-mono text-[12px] text-primary/70">⤴</span>
              <p className="text-[11.5px] text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Realtime push:
                </span>{" "}
                Postgres change → websocket → <Mono>RealtimeBridge</Mono> →{" "}
                <Mono>router.refresh()</Mono> + toast (skips the request loop)
              </p>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 02 · Data model ────────────────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="02"
            kicker="Data model"
            title="Everything hangs off three hubs"
            blurb="profiles, workspaces, and tasks are the entities the rest of the schema references. Membership tables (workspace / team / project) bind people to scopes; tasks fan out to assignees, comments, attachments, notifications, and activity. Access is decided by SECURITY DEFINER helpers called from RLS policies and triggers — not in app code."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Group label="Identity & workspace" color="bg-primary">
                <Entity
                  name="profiles"
                  hub
                  desc="person; 1:1 with auth.users. Holds pinned_project_ids[], department, status."
                  rel={["auth.users"]}
                />
                <Entity
                  name="workspaces"
                  hub
                  desc="top-level container. One default workspace auto-joins new users."
                />
                <Entity
                  name="workspace_members"
                  desc="role: member · admin · superadmin (company-wide reach)."
                  rel={["workspaces", "profiles"]}
                />
              </Group>

              <Group label="Teams" color="bg-foreground/50">
                <Entity
                  name="teams"
                  desc="a group inside a workspace; owns task approval scope."
                  rel={["workspaces"]}
                />
                <Entity
                  name="team_members"
                  desc="role: admin · member."
                  rel={["teams", "profiles"]}
                />
                <Entity
                  name="team_managers"
                  desc="approvers (≥1 per team, trigger-enforced)."
                  rel={["teams", "profiles"]}
                />
                <Entity
                  name="team_invitations"
                  desc="token invites; status + 14-day expiry."
                  rel={["teams", "profiles"]}
                />
              </Group>

              <Group label="Projects" color="bg-emerald-500">
                <Entity
                  name="projects"
                  desc="task container; created via a definer RPC."
                  rel={["workspaces", "profiles"]}
                />
                <Entity
                  name="project_members"
                  desc="role: admin · member. The post-0030 visibility gate."
                  rel={["projects", "profiles"]}
                />
              </Group>

              <Group label="Tasks" color="bg-primary" wide>
                <Entity
                  name="tasks"
                  hub
                  desc="status todo · doing · in_review · done. Carries assignee, author, project, team, due, priority, recurrence, approval."
                  rel={[
                    "projects",
                    "teams",
                    "workspaces",
                    "profiles (assignee/author/approved_by)",
                    "tasks (parent_task_id)",
                  ]}
                />
                <Entity
                  name="task_assignees"
                  desc="multi-assignee join; primary mirrors tasks.assignee_id (trigger-synced)."
                  rel={["tasks", "profiles"]}
                />
                <Entity
                  name="subtasks"
                  desc="not a table — one-level nesting via tasks.parent_task_id."
                  rel={["tasks"]}
                />
              </Group>

              <Group label="Collaboration" color="bg-amber-500">
                <Entity
                  name="task_comments"
                  desc="one-level threaded replies (same-task enforced)."
                  rel={["tasks", "profiles", "task_comments (parent)"]}
                />
                <Entity
                  name="comment_reactions"
                  desc="emoji toggle; (comment, user, emoji)."
                  rel={["task_comments", "profiles"]}
                />
                <Entity
                  name="task_attachments"
                  desc="file (Storage) or link; per-task."
                  rel={["tasks", "workspaces", "profiles"]}
                />
              </Group>

              <Group label="Signals" color="bg-rose-500">
                <Entity
                  name="notifications"
                  desc="assigned · completed · rescheduled · comment · mention. Realtime → toasts."
                  rel={["profiles (recipient/actor)", "tasks", "task_comments"]}
                />
                <Entity
                  name="task_activity_logs"
                  desc="audit trail of task mutations (trigger-written)."
                  rel={["tasks", "profiles"]}
                />
              </Group>

              <Group label="Personalization" color="bg-foreground/40">
                <Entity
                  name="saved_views"
                  desc="per-user filters (e.g. inbox), JSON config."
                  rel={["profiles"]}
                />
                <Entity
                  name="pinned_project_ids[]"
                  desc="sidebar pin order — an array column on profiles."
                  rel={["profiles", "projects"]}
                />
              </Group>

              <Group
                label="Access control · functions & triggers"
                color="bg-primary"
                wide
              >
                <Entity
                  name="is_superadmin() · is_workspace_admin()"
                  desc="company-wide / roster powers (admin + superadmin)."
                />
                <Entity
                  name="in_my_team() · is_team_manager() · is_project_member()"
                  desc="scope checks the RLS policies call."
                />
                <Entity
                  name="can_see_task()"
                  desc="task visibility: project member, or inbox author/assignee."
                />
                <Entity
                  name="create_project_for_me() · accept_team_invitation()"
                  desc="SECURITY DEFINER RPCs for atomic, gated writes."
                />
                <Entity
                  name="task_approval_gate() ⚑"
                  desc="trigger: team tasks need a manager to finalize → done."
                />
                <Entity
                  name="notify_* · sync_primary_assignee · log_task_activity"
                  desc="triggers that fan out notifications, mirror assignees, audit."
                />
              </Group>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 03 · Information architecture ──────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="03"
            kicker="Information architecture"
            title="Two tiers: get in, then get work done"
            blurb="Outside the app: auth, the public case study, and invite acceptance. Inside: a personal work-queue spine (My Day → Completed), then approvals, projects, people, and the admin surfaces — ordered the way the sidebar presents them. Heavy surfaces are overlays, not routes, keyed by URL params or context."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            {/* Top split */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="flex-1 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Tier A · Public & auth
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Reachable signed-out. Gated by <Mono>proxy.ts</Mono>.
                </p>
              </div>
              <div className="grid place-items-center px-2 text-muted-foreground/50">
                <span className="font-mono text-[18px]">→</span>
              </div>
              <div className="flex-[2] rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-readable">
                  Tier B · Main app
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Authenticated; every page additionally bounded by RLS.
                </p>
              </div>
            </div>

            {/* Tier A */}
            <div className="grid gap-3 sm:grid-cols-2">
              <NavGroup label="Public & auth">
                <Route path="/" desc="redirect → /process (anon) or app (auth)" />
                <Route path="/login" desc="Google OAuth + magic link" />
                <Route path="/auth/callback" desc="exchange code → session" />
                <Route path="/auth/error" desc="auth failure surface" />
                <Route path="/process" desc="public case-study writeup" />
                <Route
                  path="/accept-invite/[token]"
                  desc="open an invite, then join"
                />
              </NavGroup>
              <NavGroup label="Onboarding">
                <Route
                  path="/onboarding"
                  desc="first-run: create a team, pick a role"
                />
              </NavGroup>
            </div>

            {/* Tier B */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NavGroup label="Work queues">
                <Route path="/today" desc="My Day — due today + soon" />
                <Route
                  path="/assigned-to-me"
                  desc="everything assigned to you"
                />
                <Route path="/my-tasks" desc="tasks you authored" />
                <Route path="/inbox" desc="untriaged, project-less" />
                <Route path="/upcoming" desc="future due dates" />
                <Route path="/completed" desc="what you have shipped" />
              </NavGroup>

              <div className="space-y-3">
                <NavGroup label="Approvals">
                  <Route
                    path="/approvals"
                    desc="in_review queue to sign off"
                    tag="mgr · super"
                  />
                </NavGroup>
                <NavGroup label="Projects">
                  <Route
                    path="/projects/[id]"
                    desc="one project's task list"
                  />
                </NavGroup>
                <NavGroup label="Account">
                  <Route path="/profile" desc="status, department, avatar" />
                </NavGroup>
              </div>

              <div className="space-y-3">
                <NavGroup label="People & workspace">
                  <Route path="/workspace" desc="roster + per-person pulse" />
                  <Route
                    path="/workspace/[id]"
                    desc="a teammate's profile & tasks"
                  />
                  <Route path="/people" desc="directory by department" />
                  <Route
                    path="/workspace/manage"
                    desc="roster CRUD, roles, invites"
                    tag="admin"
                  />
                </NavGroup>
                <NavGroup label="Admin">
                  <Route
                    path="/admin"
                    desc="superadmin grants + team managers"
                    tag="super"
                  />
                </NavGroup>
              </div>
            </div>

            {/* Overlays + surfaces */}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Overlays · not routes
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <Pill>Task drawer · ?task=</Pill>
                  <Pill>Quick add</Pill>
                  <Pill>Search · ⌘K</Pill>
                  <Pill>Notifications</Pill>
                  <Pill>Theme</Pill>
                  <Pill>Confirm</Pill>
                  <Pill>Create workspace</Pill>
                  <Pill>Invite teammate</Pill>
                  <Pill>Members</Pill>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Navigation surfaces
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <Pill>Desktop sidebar</Pill>
                  <Pill>Workspace switcher</Pill>
                  <Pill>Profile menu</Pill>
                  <Pill>Mobile bottom-nav</Pill>
                  <Pill>Mobile menu sheet</Pill>
                </div>
              </div>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 04 · User flow ─────────────────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="04"
            kicker="User flow"
            title="How people actually move through Loop"
            blurb="The journeys that matter, from first sign-in to a task signed off. Capture is friction-free (⌘K from anywhere); team work routes through a manager approval loop; assignment and collaboration fan out as realtime notifications. Accent steps mark where a journey lands."
          />
        </Reveal>
        <Reveal delay={120}>
          <Canvas>
            <div className="grid gap-3 lg:grid-cols-2">
              {JOURNEYS.map((j) => (
                <Journey key={j.tag} {...j} />
              ))}
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* Footer */}
      <Reveal delay={80}>
        <footer className="mt-20 border-t border-border/50 pt-6">
          <p className="text-[12px] text-muted-foreground">
            Drawn from the codebase on 2026-06-03 — migrations{" "}
            <Mono className="text-[11px]">0001</Mono>–
            <Mono className="text-[11px]">0037</Mono>, the App Router tree, and
            the provider/realtime wiring. If the schema or routes move, this map
            should move with them.
          </p>
        </footer>
      </Reveal>
    </main>
  );
}
