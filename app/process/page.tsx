import Image from "next/image";
import Link from "next/link";
import {
  ArrowUp,
  CheckCircle,
  Crosshair,
  Folder,
  Hash,
  PaperPlaneTilt,
  Tray,
  UsersThree,
} from "@/components/icons";

export const metadata = {
  title: "Process · Loop",
  description:
    "How I built Loop in two days for the Tist take-home: decisions, tradeoffs, and where AI helped or got in the way.",
};

export default function ProcessPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-6 pb-32 pt-16 sm:px-10 sm:pt-24 lg:px-14">
      <Hero />
      <BriefAnswers />
      <WhatIBuilt />
      <Screens />
      <SmallCalls />
      <Principles />
      <UXDecisions />
      <ArchitectureDecisions />
      <AILoop />
      <DemoAccounts />
      <NextUp />
      <Footer />
    </main>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mb-16">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Take-home · Tist · 2 days
      </p>
      <h1 className="mt-3 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[56px]">
        Loop
      </h1>
      <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
        Two days, built end-to-end. I made the product calls.
        Claude Code wrote most of the code under my direction. This
        page is how I thought about each decision.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-2.5">
        <Link
          href="/login"
          className="focus-ring surface-brand surface-brand-hover inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-[13.5px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
        >
          Try the app
          <ArrowUp size={13} weight="bold" className="rotate-45" />
        </Link>
        <a
          href="https://github.com/v1shalm/loop-app"
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-[13.5px] font-medium text-foreground transition-colors hover:bg-accent/40"
        >
          View source on GitHub
        </a>
      </div>
    </section>
  );
}

// ── Brief answers ──────────────────────────────────────────────────────────
//
// Reviewers asked specific questions in the brief. I answer them head-on
// before going into the longer narrative, because if you only read one
// section, this should be it.

function BriefAnswers() {
  return (
    <Section title="The brief, answered">
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BriefRow
          ask="Task operations with title, description, assignee, status, due date, priority."
          ans="All six. Inline-editable in the drawer. Due dates accept natural-language input."
        />
        <BriefRow
          ask="At least two teams, a few users each, tasks scoped to a team."
          ans="Design and Engineering, two users each. Cross-team reads refused at the database, not the client."
        />
        <BriefRow
          ask="Login flow with a demo account per role."
          ans="Google + email/password. Four demo accounts seeded, one admin and one member per team."
        />
        <BriefRow
          ask="List or board view with basic filtering."
          ans="List for My Work and Inbox, kanban for Projects. Inbox filters live on the page, no modal."
        />
        <BriefRow
          ask="At least two roles with different permissions."
          ans="Admin can manage the team, member can only work on tasks. Enforced in the DB, not the UI."
        />
      </div>

      <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Ambiguities the brief left to me
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BriefRow
          ask="Data persistence: my call."
          ans="Supabase. Removed a day of auth and DB plumbing so I could spend the time on UX."
        />
        <BriefRow
          ask='"Multiple teams" is underspecified.'
          ans="One team per user. A team switcher adds plumbing an internal task tool doesn't need."
        />
        <BriefRow
          ask="AI usage: one help, one override."
          ans={
            <>
              In{" "}
              <a
                href="#ai"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                AI in the loop
              </a>{" "}
              below.
            </>
          }
        />
      </div>
    </Section>
  );
}

function BriefRow({ ask, ans }: { ask: string; ans: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-soft-xs">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Ask
      </p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-foreground">
        {ask}
      </p>
      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
        My answer
      </p>
      <div className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
        {ans}
      </div>
    </div>
  );
}

// ── What I built ───────────────────────────────────────────────────────────

function WhatIBuilt() {
  return (
    <Section title="What I built">
      <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Crosshair size={14} />}
          title="My work"
          body="Tasks grouped by urgency, not stuffed into one list."
        />
        <Feature
          icon={<Tray size={14} />}
          title="Inbox triage"
          body="Reply-first. Snooze with a visible wake time."
        />
        <Feature
          icon={<Folder size={14} />}
          title="Project board"
          body="Kanban columns, one per project."
        />
        <Feature
          icon={<UsersThree size={14} />}
          title="Teams + roles"
          body="Admin vs member, enforced in the DB."
        />
        <Feature
          icon={<Hash size={14} />}
          title="Natural-language add"
          body="Chips light up as you type."
        />
        <Feature
          icon={<PaperPlaneTilt size={14} />}
          title="Threaded comments"
          body="Replies collapse under their parent."
        />
      </ul>
    </Section>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  );
}

// ── Screens (light + dark side-by-side) ────────────────────────────────────

const SCREENS: Array<{ name: string; alt: string; caption: string }> = [
  {
    name: "login",
    alt: "Login screen with Google OAuth and email/password",
    caption:
      "Sign-in stays small and out of the way. Demo accounts live in the table below so reviewers don't have to hunt for them.",
  },
  {
    name: "my-work",
    alt: "My work page with greeting, today's tasks, and right rail",
    caption:
      "The first screen after sign-in. I group tasks by urgency — Overdue at the top, Today, then Upcoming — instead of dropping everything into one list.",
  },
  {
    name: "inbox",
    alt: "Inbox with filter chips and triage actions",
    caption:
      "Inbox is for triage, not for working. I made Reply the default because the first thing you usually want to say is \"why me?\". Snooze always shows when the task will come back — no Later black hole.",
  },
  {
    name: "projects-board",
    alt: "Kanban-style project board with gray columns and white task cards",
    caption:
      "Projects sit side by side as columns. Easier to scan across when you're planning a week than a flat list of project pages.",
  },
  {
    name: "task-drawer",
    alt: "Floating task drawer with title, chips, description, metadata, threaded comments",
    caption:
      "Opening a task slides this drawer in instead of taking you to a new page, so you don't lose the list you came from. Comment threads stay collapsed by default.",
  },
  {
    name: "manage-team",
    alt: "Admin-only manage team page with invite form and member list",
    caption:
      "Admin-only. Members can't reach this page at all, so they never see options they can't use.",
  },
];

function Screens() {
  // Break out of the page's 1120px reading column so the screens can
  // breathe. The pairs use the full viewport up to ~1640px, so on a
  // 16" laptop each frame renders at roughly 800px wide — actually
  // showing the UI rather than thumbnails of it.
  return (
    <Section title="The interface, light and dark">
      <Prose>
        <p>
          Designed for both modes from day one. Light on the left,
          dark on the right.
        </p>
      </Prose>
      <div className="mt-6 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
        <div className="mx-auto flex max-w-[1640px] flex-col gap-10 px-2 sm:px-4">
          {SCREENS.map((s) => (
            <ScreenPair key={s.name} {...s} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScreenPair({
  name,
  alt,
  caption,
}: {
  name: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScreenFrame src={`/screens/light/${name}.png`} alt={`${alt} (light mode)`} mode="light" />
        <ScreenFrame src={`/screens/dark/${name}.png`} alt={`${alt} (dark mode)`} mode="dark" />
      </div>
      <figcaption className="mx-auto max-w-[760px] px-2 text-center text-[13px] leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

function ScreenFrame({
  src,
  alt,
  mode,
}: {
  src: string;
  alt: string;
  mode: "light" | "dark";
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.04] p-3 shadow-soft-xs">
      <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card shadow-soft-sm">
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 z-[1] inline-flex h-[22px] items-center rounded-md border border-border/60 bg-background/85 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
        >
          {mode}
        </span>
        <Image
          src={src}
          alt={alt}
          width={1440}
          height={880}
          className="block h-auto w-full"
          unoptimized
        />
      </div>
    </div>
  );
}

// ── Small calls (modals, edge cases, smart details) ───────────────────────

const SMALL_CALLS: Array<{ name: string; alt: string; caption: string }> = [
  {
    name: "quick-add-chips",
    alt: "Quick add dialog with parser chips lit up above the input",
    caption: "Type tokens, chips appear. The product teaches its own syntax.",
  },
  {
    name: "notifications-popover",
    alt: "Notifications popover open from the top bar with Mark all read",
    caption: "One notifications surface, one Mark all read.",
  },
  {
    name: "empty-filter",
    alt: "Empty inbox with the metallic pedestal empty state",
    caption: "Empty states earn their canvas. CTA, secondary, three tips.",
  },
  {
    name: "thread-expanded",
    alt: "Task drawer comment with a reaction and a Reply affordance",
    caption: "Comments take reactions and threaded replies.",
  },
];

function SmallCalls() {
  return (
    <Section title="The small calls">
      <div className="mt-2 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
        <div className="mx-auto flex max-w-[1640px] flex-col gap-10 px-2 sm:px-4">
          {SMALL_CALLS.map((s) => (
            <ScreenPair key={s.name} {...s} />
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Design principles ──────────────────────────────────────────────────────

const PRINCIPLES: { rule: string; why: string }[] = [
  {
    rule: "Quiet defaults, loud only when it matters",
    why: "Color and motion stay neutral until something is overdue or high-priority. Then they pop.",
  },
  {
    rule: "One screen, one job",
    why: "My Work answers \"what do I do today.\" Inbox answers \"what wants my attention.\" If two screens started competing, I cut one.",
  },
  {
    rule: "Empty states earn their canvas",
    why: "Every blank list gets a CTA and a short orientation. No \"nothing here\" walls.",
  },
  {
    rule: "Triage is a step, not a default",
    why: "Work from someone else lands in Inbox. I choose what to do with it before it touches my day.",
  },
  {
    rule: "Optimistic edits, undoable",
    why: "Every action lands instantly. Six seconds of Undo on completion catches the fat-finger.",
  },
  {
    rule: "No AI slop",
    why: "No colored side-stripes, no gradient text, no decorative icon tiles. If it reads as \"AI made this,\" I cut it.",
  },
];

function Principles() {
  return (
    <Section title="Design principles">
      <ul className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <li
            key={i}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs"
          >
            <p className="text-[14px] font-semibold tracking-tight text-foreground">
              {p.rule}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {p.why}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── UX decisions ───────────────────────────────────────────────────────────

function UXDecisions() {
  return (
    <Section title="UX decisions">
      <div className="mt-2 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Decision title="Team creator becomes the admin.">
          <p>
            Letting a user pick their own role is a security smell.
            The first user creates the team and gets admin. Everyone
            else arrives via invite, which fixes the role. Same
            pattern as Linear, Notion, Slack.
          </p>
        </Decision>

        <Decision title="Inbox is reply-first, not accept-first.">
          <p>
            When a teammate sends me a task, the first thing I want
            to do is ask &quot;why me?&quot;, not commit silently.
            Reply is the default action. Accept comes after.
          </p>
        </Decision>

        <Decision title="Workflow status moved off tasks, onto projects.">
          <p>
            Tried it on tasks first — clashed with the todo/done
            checkbox and added a second status indicator. Status
            belongs at the project level. Tasks stay binary.
          </p>
        </Decision>

        <Decision title="Three sidebar widgets → one right rail.">
          <p>
            Today, Team Pulse, and Recent Activity sat as three
            sidebar sections at first. The canvas felt cramped. One
            consolidated card on the right freed the canvas and gave
            them a clearer relationship.
          </p>
        </Decision>

        <Decision title="Task drawer floats. It isn&apos;t a new page.">
          <p>
            Opening a task slides this panel in instead of taking
            you to <code>/tasks/[id]</code>. You don&apos;t lose the
            list. The URL still updates with <code>?task=</code> so
            the view stays shareable.
          </p>
        </Decision>

        <Decision title="Self-assigned tasks skip the inbox.">
          <p>
            Triage exists to decide whether to accept work from
            someone else. Triaging your own work is silly. Self-
            assign lands straight in My Work.
          </p>
        </Decision>

        <Decision title="The parser shows its work.">
          <p>
            First version stripped <code>#project @name p1 tomorrow</code>{" "}
            silently. Now the chips appear above the input as each
            token is recognised — the product teaches its own syntax.
            Borrowed from Todoist.
          </p>
        </Decision>

        <Decision title="Comment threads, one level deep.">
          <p>
            Long discussions in a flat list become a wall. Replies
            collapse under their parent. One level only — nobody
            wants a 5-deep argument in a task tracker.
          </p>
        </Decision>

        <Decision title="Search and notifications in the top bar.">
          <p>
            They lived in the sidebar header first. When the sidebar
            collapsed, they disappeared. Moved to a top bar so
            they&apos;re always reachable.
          </p>
        </Decision>

        <Decision title="No keyboard shortcuts.">
          <p>
            ⌘K, Q, and ? were wired early. Then I asked who uses
            Loop — internal team members, not Linear power users. I
            cut all of them. The visible search box and Add task
            button do the same jobs, more discoverably.
          </p>
        </Decision>

        <Decision title="Filtered empty states get their own message.">
          <p>
            Filtering inbox by <code>@Priya</code> and seeing &quot;All
            caught up&quot; is a lie. When a filter is active, the
            message becomes &quot;No tasks match this filter&quot;
            with a Clear button.
          </p>
        </Decision>

        <Decision title="Collaborators show as a +N pip.">
          <p>
            A task can have one owner and several collaborators. The
            row only showed the owner. A small <code>+N</code> in the
            corner of the avatar tells you the rest are there.
          </p>
        </Decision>

        <Decision title="No widows. Set as a global rule.">
          <p>
            One screenshot showed an empty-state hint ending with
            &quot;now.&quot; on its own line. Instead of fixing that
            paragraph, I made it global. Every prose block in the app
            self-corrects now.
          </p>
        </Decision>
      </div>
    </Section>
  );
}

// ── Architecture decisions ─────────────────────────────────────────────────

function ArchitectureDecisions() {
  return (
    <Section title="Architecture decisions">
      <div className="mt-2 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Decision title="Next.js + Supabase + Tailwind.">
          <p>
            Supabase removes a day of auth and DB plumbing. The brief
            ranks UX first, so I picked the stack that ships features
            fast and saves the polish budget for the surfaces a
            reviewer actually touches.
          </p>
        </Decision>

        <Decision title="One team per user.">
          <p>
            Enforced with a unique index in the DB. A team switcher,
            current-team context, and edge cases like &quot;what does
            Inbox mean across three teams?&quot; aren&apos;t worth it
            for a 2-day build. Reversible later if needed.
          </p>
        </Decision>

        <Decision title="Roles enforced at the database.">
          <p>
            Admin vs member lives in an{" "}
            <code>is_team_admin()</code> RLS function. An app-only
            check is bypassable; the DB refuses the write either way.
          </p>
        </Decision>

        <Decision title="Real auth, not a fake password gate.">
          <p>
            Google OAuth + email/password via Supabase. Four demo
            accounts seeded — one admin and one member per team — with
            credentials in the table below.
          </p>
        </Decision>

        <Decision title="Region: Mumbai.">
          <p>
            Default Supabase region is US-East (~180ms round-trip).
            ap-south-1 brings it to ~67ms. Inline edits feel
            measurably faster.
          </p>
        </Decision>

        <Decision title="Optimistic UI everywhere.">
          <p>
            Every mutation lands instantly on the client, then the
            server reconciles. If it errors, I roll back and surface
            a toast. Perceived latency is under 16ms; the network
            happens in the background.
          </p>
        </Decision>
      </div>
    </Section>
  );
}

function Decision({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft-xs">
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="prose-on-card mt-2 flex flex-col gap-2.5 text-[13.5px] leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-medium [&_code]:text-foreground">
        {children}
      </div>
    </article>
  );
}

// ── AI in the loop ──────────────────────────────────────────────────────────

function AILoop() {
  return (
    <Section title="AI in the loop" id="ai">
      <Prose>
        <p>
          Claude as a build partner, not a designer. I made the
          product calls; Claude wrote the code. One win, one
          override.
        </p>
      </Prose>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SplitCard
          tone="win"
          tag="Where Claude helped"
          title="The kanban board, ten minutes instead of an hour"
        >
          <p>
            I&apos;d already decided the structure: one column per
            project, task cards stacked inside. The first pass came
            back with flat project cards instead of nested ones. I
            sent a quick screenshot back, the next pass was right.
          </p>
          <p>
            Fast because the design call was already made. Claude is
            a multiplier on decisions you&apos;ve made, not a
            substitute for making them.
          </p>
        </SplitCard>

        <SplitCard
          tone="override"
          tag="Where I overrode Claude"
          title="The colored-stripe reflex"
        >
          <p>
            I asked for an &quot;urgent&quot; treatment on overdue
            tasks. Claude reached for the classic AI move: a 3px
            colored bar on the left edge of every card. Generic, and
            it doesn&apos;t scale once you have priority colors too.
          </p>
          <p>
            I cut it. Urgency comes through the date text turning
            rose and the priority flag color — same signal, no
            decoration. This kind of pullback happened a few times
            across the two days.
          </p>
        </SplitCard>
      </div>
    </Section>
  );
}

function SplitCard({
  tone,
  tag,
  title,
  children,
}: {
  tone: "win" | "override";
  tag: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={
        tone === "win"
          ? "flex flex-col gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 dark:border-emerald-400/30 dark:bg-emerald-500/10"
          : "flex flex-col gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5 dark:border-rose-400/30 dark:bg-rose-500/10"
      }
    >
      <p
        className={
          tone === "win"
            ? "text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300"
            : "text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-700 dark:text-rose-300"
        }
      >
        {tag}
      </p>
      <h3 className="text-[14.5px] font-semibold leading-snug tracking-tight text-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </article>
  );
}

// ── Demo accounts ───────────────────────────────────────────────────────────

const DEMOS = [
  {
    name: "Alex Chen",
    team: "Design",
    role: "Admin",
    email: "alex@loop.app",
    pw: "alex-loop-2026",
  },
  {
    name: "Mia Patel",
    team: "Design",
    role: "Member",
    email: "mia@loop.app",
    pw: "mia-loop-2026",
  },
  {
    name: "Ravi Kumar",
    team: "Engineering",
    role: "Admin",
    email: "ravi@loop.app",
    pw: "ravi-loop-2026",
  },
  {
    name: "Priya Shah",
    team: "Engineering",
    role: "Member",
    email: "priya@loop.app",
    pw: "priya-loop-2026",
  },
];

function DemoAccounts() {
  return (
    <Section title="Demo accounts">
      <Prose>
        <p>
          Sign in as an admin to see the full surface, or a member
          to feel the role gating.
        </p>
      </Prose>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Password</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {DEMOS.map((d, i) => (
              <tr
                key={d.email}
                className={
                  i < DEMOS.length - 1
                    ? "border-b border-border/40"
                    : undefined
                }
              >
                <td className="px-4 py-2.5">
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {d.email}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {d.team}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      d.role === "Admin"
                        ? "inline-flex items-center rounded-md border border-violet-200/70 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200"
                        : "inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {d.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                  {d.pw}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── What's next ─────────────────────────────────────────────────────────────

const NEXT_ITEMS = [
  "Multiple views per project (List / Board / Calendar) — same data, three lenses",
  "Inline title editing on rows so renaming doesn't require opening the drawer",
  "Trash with 30-day restore — delete with confidence, recover with one click",
  "Filters live in the URL so a filtered inbox view is shareable in Slack",
  "Project covers + emoji icons — Notion's secret weapon for scanability",
  "Hover-preview cards on @mentions and task links",
  "Recently visited in the sidebar — top 5 surfaces you just opened",
];

function NextUp() {
  return (
    <Section title="What I&apos;d ship next">
      <Prose>
        <p>
          Two days meant cutting things I wanted. In priority order,
          these are the calls I&apos;d make if I had another week:
        </p>
      </Prose>
      <ul className="mt-4 flex flex-col gap-2">
        {NEXT_ITEMS.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-[13.5px] text-foreground"
          >
            <CheckCircle
              size={14}
              weight="fill"
              className="mt-0.5 shrink-0 text-primary/70"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 pt-8 text-[12.5px] text-muted-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p>
          Built in two days for the Tist round-two take-home.
        </p>
        <Link
          href="/login"
          className="text-foreground transition-colors hover:text-primary"
        >
          Try the app →
        </Link>
      </div>
    </footer>
  );
}

// ── Shared building blocks ──────────────────────────────────────────────────

function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="mt-14 scroll-mt-8" id={id}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  // Constrain prose paragraphs to a readable ~70-char column even
  // when the outer container goes wide. Cards, grids, and pair
  // layouts use the full container width; flowing text doesn't.
  return (
    <div className="flex max-w-[760px] flex-col gap-3 text-[14.5px] leading-[1.65] text-foreground/80">
      {children}
    </div>
  );
}
