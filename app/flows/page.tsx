import type { Metadata } from "next";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import styles from "./flows.module.css";

export const metadata: Metadata = {
  title: "System map · Loop",
  description:
    "How Loop works, top to bottom — architecture, data, screens, and the paths people take.",
};

/* ============================================================================
   /flows — Loop's system map, in four plain-English diagrams:
     01  Architecture   — the three layers and how a request moves
     02  Data           — what Loop stores and how it connects
     03  Screens (IA)   — a tree of every screen, grouped like the nav
     04  User flow      — a flowchart of the paths people take
   Static server component. Connector lines live in flows.module.css.
   ========================================================================== */

// ── Shared primitives ───────────────────────────────────────────────────────

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

// ── 01 · Architecture ───────────────────────────────────────────────────────

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

function FlowStrip({ down, up }: { down: string[]; up: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <FlowRow dir="down" labels={down} />
      <FlowRow dir="up" labels={up} />
    </div>
  );
}

// ── 02 · Data ────────────────────────────────────────────────────────────────

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
            core
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

// ── 03 · Screens (IA tree) ───────────────────────────────────────────────────

type IaCategory = {
  cat: string;
  tag?: string;
  items: { name: string; path: string }[];
};

const IA: IaCategory[] = [
  {
    cat: "My work",
    items: [
      { name: "My Day", path: "/today" },
      { name: "Assigned to me", path: "/assigned-to-me" },
      { name: "My tasks", path: "/my-tasks" },
      { name: "Inbox", path: "/inbox" },
      { name: "Upcoming", path: "/upcoming" },
      { name: "Completed", path: "/completed" },
    ],
  },
  {
    cat: "Approvals",
    tag: "managers",
    items: [{ name: "Approval queue", path: "/approvals" }],
  },
  {
    cat: "Projects",
    items: [{ name: "A project", path: "/projects/[id]" }],
  },
  {
    cat: "People",
    items: [
      { name: "Team overview", path: "/workspace" },
      { name: "A teammate", path: "/workspace/[id]" },
      { name: "Directory", path: "/people" },
      { name: "Manage roster", path: "/workspace/manage" },
    ],
  },
  {
    cat: "Admin",
    tag: "superadmin",
    items: [{ name: "Workspace admin", path: "/admin" }],
  },
];

function CatTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary-readable">
      {children}
    </span>
  );
}

// ── 04 · User flow (flowchart) ───────────────────────────────────────────────

const TONES = {
  start: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  action: "bg-blue-500/12 text-blue-700 ring-blue-500/20 dark:text-blue-300",
  setup:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  decision:
    "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-300",
  review: "bg-blue-500/12 text-blue-700 ring-blue-500/20 dark:text-blue-300",
  done: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
} as const;

function FlowCard({
  tone,
  chip,
  title,
  desc,
  path,
}: {
  tone: keyof typeof TONES;
  chip: string;
  title: string;
  desc?: string;
  path?: string;
}) {
  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-center">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] ring-1 ring-inset",
            TONES[tone]
          )}
        >
          {chip}
        </span>
      </div>
      <div className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-soft-sm">
        <p className="text-center text-[13.5px] font-semibold text-foreground">
          {title}
          {path && (
            <Mono className="ml-1.5 rounded bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {path}
            </Mono>
          )}
        </p>
        {desc && (
          <>
            <div className="my-2 h-px w-full bg-border/50" />
            <p className="text-center text-[12px] leading-snug text-muted-foreground">
              {desc}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function BranchLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-2 w-fit rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground shadow-soft-xs">
      {children}
    </div>
  );
}

function MiniFlow({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
      <h3 className="mb-2.5 text-[12px] font-semibold text-foreground">
        {title}
      </h3>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {steps.map((s, i) => (
          <Fragment key={s}>
            {i > 0 && (
              <span className="select-none font-mono text-[12px] text-primary/45">
                →
              </span>
            )}
            <span className="rounded-md border border-border/55 bg-background/70 px-2.5 py-1 text-[11.5px] text-foreground/85 shadow-soft-xs">
              {s}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

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
          How Loop works,
          <br className="hidden sm:block" /> top to bottom.
        </h1>
        <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-muted-foreground">
          Four maps of the app, drawn straight from the code: how it is built,
          what it stores, how the screens are organised, and the paths people
          take through it. Loop is a content-first task tracker on Next.js 16 and
          Supabase.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "React 19",
            "Supabase — data, login, live updates, files",
            "Access rules live in the database",
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

      {/* ── 01 · Architecture ───────────────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="01"
            kicker="Architecture"
            title="Three layers, one loop"
            blurb="Your browser shows the pages and listens for live updates. The Next.js server checks who you are, reads data, and saves changes. Supabase holds everything and decides who is allowed to see what. Every read and write goes through those rules — and live changes are pushed straight back to the browser."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            <LayerCard tag="You see this" title="Browser" dot="bg-primary">
              <Node title="The pages" sub="server-rendered, then interactive" />
              <Node
                title="Providers"
                sub="theme, team, notifications, search, quick-add"
              />
              <Node title="App shell" sub="loads the heavy pop-ups on demand" />
              <Node title="Task rows & drawers" sub="the interactive bits" />
              <Node title="Live updates" sub="listens for changes" />
              <Node title="Toasts & sounds" sub="gentle feedback" />
            </LayerCard>

            <FlowStrip
              down={["load a page (login checked first)", "save a change"]}
              up={["the finished page comes back"]}
            />

            <LayerCard tag="Runs on the server" title="Next.js 16" dot="bg-foreground/60">
              <Node title="proxy.ts" sub="checks your login on every request" />
              <Node title="Layouts" sub="gate access, load your data" />
              <Node title="Pages" sub="the screens, rendered on the server" />
              <Node title="queries.ts" sub="reads data (cached)" />
              <Node title="actions.ts" sub="saves changes" />
              <Node title="auth callback" sub="turns a login into a session" />
            </LayerCard>

            <FlowStrip
              down={[
                "read (only what you're allowed to see)",
                "write (with safe, all-or-nothing helpers)",
              ]}
              up={["the rows you may see", "knock-on effects (alerts, history)"]}
            />

            <LayerCard tag="The source of truth" title="Supabase" dot="bg-emerald-500">
              <Node title="Login" sub="Google or a magic link" />
              <Node
                title="Database + rules"
                sub="every table guards its own rows"
              />
              <Node title="Live updates" sub="changes streamed to the browser" />
              <Node title="File storage" sub="attachments on tasks" />
            </LayerCard>

            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-2 text-center">
              <span className="font-mono text-[12px] text-primary/70">⤴</span>
              <p className="text-[11.5px] text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Live updates:
                </span>{" "}
                when data changes, Supabase pushes it to the browser, which
                quietly refreshes and shows a toast — no page reload.
              </p>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 02 · Data ───────────────────────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="02"
            kicker="Data"
            title="What Loop stores"
            blurb="Three things sit at the centre — people, workspaces, and tasks — and everything else points back to them. Membership lists decide who is in which workspace, team, and project. Tasks branch out to owners, comments, files, and alerts. Who can see what is decided by database rules, not the app."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Group label="People & workspace" color="bg-primary">
                <Entity
                  name="profiles"
                  hub
                  desc="A person — one row per signed-in user."
                  rel={["the login account"]}
                />
                <Entity
                  name="workspaces"
                  hub
                  desc="The top-level container everything lives in."
                />
                <Entity
                  name="workspace_members"
                  desc="Who is in a workspace, and their role: member, admin, or superadmin."
                  rel={["workspaces", "profiles"]}
                />
              </Group>

              <Group label="Teams" color="bg-foreground/50">
                <Entity
                  name="teams"
                  desc="A group inside a workspace; owns task approvals."
                  rel={["workspaces"]}
                />
                <Entity
                  name="team_members"
                  desc="Who is on a team (admin or member)."
                  rel={["teams", "profiles"]}
                />
                <Entity
                  name="team_managers"
                  desc="Who can approve a team's work (at least one per team)."
                  rel={["teams", "profiles"]}
                />
                <Entity
                  name="team_invitations"
                  desc="Pending email invites that expire."
                  rel={["teams", "profiles"]}
                />
              </Group>

              <Group label="Projects" color="bg-emerald-500">
                <Entity
                  name="projects"
                  desc="A place to hold tasks."
                  rel={["workspaces", "profiles"]}
                />
                <Entity
                  name="project_members"
                  desc="Who can see and edit a project."
                  rel={["projects", "profiles"]}
                />
              </Group>

              <Group label="Tasks" color="bg-primary" wide>
                <Entity
                  name="tasks"
                  hub
                  desc="The core record: who it is for, who made it, its project, team, due date, priority, and status (to-do, doing, in review, done)."
                  rel={[
                    "projects",
                    "teams",
                    "workspaces",
                    "profiles (owner, author)",
                    "a parent task",
                  ]}
                />
                <Entity
                  name="task_assignees"
                  desc="Lets a task have more than one owner."
                  rel={["tasks", "profiles"]}
                />
                <Entity
                  name="subtasks"
                  desc="Not its own table — a task can point to a parent task."
                  rel={["tasks"]}
                />
              </Group>

              <Group label="Conversation" color="bg-amber-500">
                <Entity
                  name="task_comments"
                  desc="Comments, with one level of replies."
                  rel={["tasks", "profiles"]}
                />
                <Entity
                  name="comment_reactions"
                  desc="Emoji reactions on a comment."
                  rel={["task_comments", "profiles"]}
                />
                <Entity
                  name="task_attachments"
                  desc="Files or links on a task."
                  rel={["tasks", "profiles"]}
                />
              </Group>

              <Group label="Alerts & history" color="bg-rose-500">
                <Entity
                  name="notifications"
                  desc="Alerts — assigned, completed, comment, mention. Shown as live toasts."
                  rel={["profiles", "tasks"]}
                />
                <Entity
                  name="task_activity_logs"
                  desc="A record of what changed on a task."
                  rel={["tasks", "profiles"]}
                />
              </Group>

              <Group label="Personal touches" color="bg-foreground/40">
                <Entity
                  name="saved_views"
                  desc="Saved filters, per person."
                  rel={["profiles"]}
                />
                <Entity
                  name="pinned projects"
                  desc="The order of pinned projects in the sidebar."
                  rel={["profiles", "projects"]}
                />
              </Group>

              <Group label="The rules that guard everything" color="bg-primary" wide>
                <Entity
                  name="is_superadmin · is_workspace_admin"
                  desc="Checks for company-wide reach and roster powers."
                />
                <Entity
                  name="in_my_team · is_team_manager · is_project_member"
                  desc="The scope checks the rules rely on."
                />
                <Entity
                  name="can_see_task"
                  desc="Decides whether you may see a task at all."
                />
                <Entity
                  name="create_project · accept_invitation"
                  desc="Safe, all-or-nothing writes."
                />
                <Entity
                  name="approval gate"
                  desc="Stops a team task closing without a manager."
                />
                <Entity
                  name="alert · sync · history triggers"
                  desc="Send alerts, keep data in sync, record changes — automatically."
                />
              </Group>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 03 · Screens (IA tree) ──────────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="03"
            kicker="Screens"
            title="How the app is organised"
            blurb="A few screens come before you sign in. After that, everything sits under five groups — the same way the sidebar lays them out. Some screens are only for managers or superadmins."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            {/* before sign-in */}
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Before sign-in
              </span>
              {["/ home", "/login", "/onboarding", "/accept-invite"].map((p) => (
                <Mono
                  key={p}
                  className="rounded bg-muted/70 px-1.5 py-0.5 text-[11px] text-foreground/80"
                >
                  {p}
                </Mono>
              ))}
              <span className="text-[11px] text-muted-foreground">
                then into the app ↓
              </span>
            </div>

            {/* the tree */}
            <div className={styles.treeScroll}>
              <div className={styles.tree}>
                <div className={styles.root}>
                  <span className="inline-block rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-2 text-[13px] font-semibold text-foreground shadow-soft-xs">
                    Loop · signed in
                  </span>
                </div>

                <div className={styles.cats}>
                  {IA.map((c) => (
                    <div key={c.cat} className={styles.cat}>
                      <div className="mx-auto w-fit rounded-lg border border-border/70 bg-card px-3 py-1.5 text-center text-[12.5px] font-semibold text-foreground shadow-soft-xs">
                        {c.cat}
                        {c.tag && <CatTag>{c.tag}</CatTag>}
                      </div>
                      <ul className={styles.vlist}>
                        {c.items.map((it) => (
                          <li key={it.path} className={styles.vitem}>
                            <div className="rounded-md border border-border/55 bg-background/70 px-2.5 py-1.5 shadow-soft-xs">
                              <p className="text-[12px] font-medium leading-tight text-foreground">
                                {it.name}
                              </p>
                              <Mono className="text-[10.5px] font-medium text-muted-foreground">
                                {it.path}
                              </Mono>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* pop-up surfaces */}
            <div className="mt-6 rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Pop-ups (no screen of their own)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Task details",
                  "Quick add",
                  "Search (⌘K)",
                  "Notifications",
                  "Theme",
                  "Confirm",
                  "Invite teammate",
                  "Members",
                ].map((p) => (
                  <span
                    key={p}
                    className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-foreground/85 shadow-soft-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* ── 04 · User flow (flowchart) ──────────────────────────────────── */}
      <section className="mt-20">
        <Reveal delay={60}>
          <SectionHeading
            index="04"
            kicker="User flow"
            title="The path from sign-in to done"
            blurb="The main journey, start to finish. Most of it is a straight line; the one fork is at the end — a team task needs a manager to sign it off, a personal task is done right away. A few shorter paths sit below."
          />
        </Reveal>

        <Reveal delay={120}>
          <Canvas>
            <div className={styles.flow}>
              <div className="w-full max-w-[440px]">
                <FlowCard
                  tone="start"
                  chip="Start"
                  title="Open Loop"
                  desc="You land on the home page. Where you go next depends on whether you are signed in."
                />
              </div>
              <div className={styles.conn} />

              <div className="w-full max-w-[440px]">
                <FlowCard
                  tone="action"
                  chip="Sign in"
                  title="Log in"
                  desc="With Google or a magic link. That starts your session."
                />
              </div>
              <div className={styles.conn} />

              <div className="w-full max-w-[440px]">
                <FlowCard
                  tone="setup"
                  chip="Set up"
                  title="First time? Make a team"
                  desc="New people create a team and pick a role. Returning people skip straight in."
                />
              </div>
              <div className={styles.conn} />

              <div className="w-full max-w-[440px]">
                <FlowCard
                  tone="action"
                  chip="Capture"
                  title="Add a task"
                  desc="Press ⌘K from anywhere. Set who it is for, when it is due, and the project."
                />
              </div>
              <div className={styles.conn} />

              <div className="w-full max-w-[440px]">
                <FlowCard
                  tone="action"
                  chip="Do"
                  title="Work on it"
                  desc="Open the task. Leave comments, add sub-tasks and files."
                />
              </div>
              <div className={styles.conn} />

              <div className="w-full max-w-[480px]">
                <FlowCard
                  tone="decision"
                  chip="Check"
                  title="Mark complete — is it a team task?"
                />
              </div>
              <div className={styles.conn} />

              <div className={styles.split}>
                <div className={styles.splitCol}>
                  <BranchLabel>yes · team task</BranchLabel>
                  <div className={styles.conn} />
                  <FlowCard
                    tone="review"
                    chip="Review"
                    title="A manager signs it off"
                    path="/approvals"
                    desc={`It becomes "In review" and shows up in Approvals. Approve it and it is Done — or send it back with a note.`}
                  />
                </div>
                <div className={styles.splitCol}>
                  <BranchLabel>no · personal task</BranchLabel>
                  <div className={styles.conn} />
                  <FlowCard
                    tone="done"
                    chip="Done"
                    title="Marked done"
                    desc="It closes right away — no approval needed."
                  />
                </div>
              </div>
            </div>

            {/* shorter paths */}
            <div className="mt-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Shorter paths
              </p>
              <div className="grid gap-3 lg:grid-cols-3">
                <MiniFlow
                  title="Talk it through"
                  steps={[
                    "Comment or @mention",
                    "Loop alerts the right people",
                    "Live toast + bell",
                    "They open the task",
                  ]}
                />
                <MiniFlow
                  title="Invite a teammate"
                  steps={[
                    "Admin sends an invite",
                    "They get a link",
                    "Open /accept-invite",
                    "They join the team",
                  ]}
                />
                <MiniFlow
                  title="Run the workspace"
                  steps={[
                    "Profile menu",
                    "Open /admin",
                    "Set roles & approvers",
                  ]}
                />
              </div>
            </div>
          </Canvas>
        </Reveal>
      </section>

      {/* Footer */}
      <Reveal delay={80}>
        <footer className="mt-20 border-t border-border/50 pt-6">
          <p className="text-[12px] text-muted-foreground">
            Drawn from the code on 2026-06-03 — the database, the screens, and
            the way they wire together. If the app changes, this map should
            change with it.
          </p>
        </footer>
      </Reveal>
    </main>
  );
}
