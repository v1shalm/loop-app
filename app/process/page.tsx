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
      <Prose>
        <p>
          The brief asked five specific things and left three on purpose
          ambiguous. I read it as a test of judgment first, craft
          second. Here&apos;s how I responded to each.
        </p>
      </Prose>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BriefRow
          ask="Task operations: create, edit, delete with title, description, assignee, status, due date, priority."
          ans="I shipped all six fields. Title and description are inline-editable in the drawer. Priority is a P1–P4 flag chip with five color tones. Due dates accept natural-language tokens (today, tomorrow, next week, weekday names). Status is a binary checkbox; workflow status moved up to the project (decision below)."
        />
        <BriefRow
          ask="Teams and users: at least two teams, a few users each, tasks scoped to a team."
          ans="Two teams seeded — Design and Engineering — with two users each. Tasks live under a team via team_id with an RLS policy that refuses cross-team reads. A Design member cannot see Engineering tasks even by guessing IDs."
        />
        <BriefRow
          ask="Authentication: login flow, demo account per role."
          ans="Real auth via Supabase magic link + Google OAuth + email/password. Four demo accounts are seeded — one admin and one member per team — and the credentials are listed below in the Demo accounts table. A reviewer can sign in as any role in seconds."
        />
        <BriefRow
          ask="Views: list or board, plus filtering by status or assignee."
          ans="My Work and Inbox are list views grouped by section (Overdue, Today, Upcoming). Projects renders as a kanban board — one column per project, task cards stacked inside. Inbox has filter chips (All, Unread, High, Snoozed) with live counts; project pages filter by status implicitly."
        />
        <BriefRow
          ask="Roles: at least two with different permissions."
          ans="Admin and member. Admins can invite members, change roles, and remove people from the team. Members can only work on tasks. The check lives in RLS via is_team_admin(team_id), so even a forged client request gets refused at the database. /team/manage is server-side gated and redirects members."
        />
      </div>

      <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Ambiguities the brief left to me
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BriefRow
          ask="Architecture: data persistence is your call."
          ans="Supabase Postgres + RLS. I picked it because the brief ranks UX first and Supabase removes a whole day of auth + DB plumbing. Server actions handle writes, RLS enforces tenancy, realtime ships presence and inbox updates for free."
        />
        <BriefRow
          ask='"Multiple teams" is underspecified.'
          ans="I decided each user belongs to exactly one team and enforced it with a unique constraint on team_members(user_id). Multi-team membership would mean a team switcher in the header and every query scoped to a current-team context — a lot of plumbing for a feature an internal task tool rarely needs. The /team/manage flow has invite-by-link so onboarding is still self-serve."
        />
        <BriefRow
          ask="AI usage: reflect on one help and one override."
          ans={
            <>
              Below in{" "}
              <a
                href="#ai"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                AI in the loop
              </a>
              . The short version: AI sketched the kanban board in ten
              minutes. AI also wanted to ship a colored side-stripe on
              every overdue card — I told it no, and the fix turned out
              cleaner.
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
      <Prose>
        <p>
          A team task tracker with two teams, four demo accounts,
          role-gated admin tools, and live sync. The interface stays
          quiet on purpose: opinionated type, tinted neutrals, motion
          that decelerates instead of bouncing.
        </p>
      </Prose>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Crosshair size={14} />}
          title="My work"
          body="Inbox, today, upcoming. Every task that lands on you, grouped by urgency."
        />
        <Feature
          icon={<Tray size={14} />}
          title="Inbox triage"
          body="Reply before accepting. Snooze with explicit wake times. No black-hole later."
        />
        <Feature
          icon={<Folder size={14} />}
          title="Project board"
          body="Kanban-style columns per project with task cards inside. Workflow status sits on the project, not the task."
        />
        <Feature
          icon={<UsersThree size={14} />}
          title="Teams + roles"
          body="Two teams, four accounts. Admin vs member enforced in RLS, not just the client."
        />
        <Feature
          icon={<Hash size={14} />}
          title="Natural-language add"
          body="Type #design @ravi tomorrow p1 and the chips light up live as you type. Backspace clears them."
        />
        <Feature
          icon={<PaperPlaneTilt size={14} />}
          title="Threaded comments"
          body="Replies collapse under their parent. Long discussions stay scannable instead of becoming a wall."
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
          I designed for both modes from the first commit. The
          screenshots below are the production app — captured via
          Playwright against the live deploy — so what you see is
          exactly what a reviewer signing in right now would see.
          Light on the left, dark on the right.
        </p>
      </Prose>
      <div className="mt-8 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
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

// ── Design principles ──────────────────────────────────────────────────────

const PRINCIPLES: { rule: string; why: string }[] = [
  {
    rule: "Quiet defaults, loud only when it matters",
    why: "I kept color and motion neutral until something is overdue, high-priority, or unread. Then they pop. The product should feel calm at rest and informative at attention.",
  },
  {
    rule: "One screen, one job",
    why: "My Work answers \"what do I do today.\" Inbox answers \"what wants my attention.\" Projects answers \"where does this work live.\" Whenever two surfaces started competing for the same question, I picked one and redirected the other.",
  },
  {
    rule: "Empty states earn their canvas",
    why: "I made every blank list teach the interface: a primary CTA, a secondary action, and a short list of what this page does once it has data. No \"nothing here\" walls, no dead canvases.",
  },
  {
    rule: "Triage is a step, not a default",
    why: "A task assigned to me by someone else lands in Inbox until I decide. Accept, reply, or snooze with a visible wake time. Nothing gets pushed silently into my day.",
  },
  {
    rule: "Optimistic edits, undoable in six seconds",
    why: "I made every destructive or status-changing action feel instant. The server reconciles in the background; if it errors, I roll back and surface a toast. Six seconds of Undo on completion is enough to catch a fat-finger, short enough to feel ephemeral.",
  },
  {
    rule: "No AI slop",
    why: "No colored side-stripes, no gradient text, no random rounded-icon tiles above every heading. If a pattern reads as \"AI made this,\" I cut it. The shortest path to looking generic is to keep every default a tool gives you.",
  },
];

function Principles() {
  return (
    <Section title="Design principles">
      <Prose>
        <p>
          These are the rules I held myself to. When a decision came up
          mid-build, I asked which principle applied first and let that
          shape the call. I&apos;m listing them here so the decisions
          further down read in context, not as one-offs.
        </p>
      </Prose>
      <ul className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
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
      <Prose>
        <p>
          The product-level calls that shaped how Loop feels to use.
          Each one started from a principle above. I&apos;ve written
          these as I thought about them, including the version I
          shipped first and the one I shipped second when the first
          didn&apos;t hold up.
        </p>
      </Prose>
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Decision title="I made the team creator the admin by default — nobody picks their own role.">
          <p>
            When a new user signs in without a team, I land them on{" "}
            <code>/onboarding</code> and have them create a team.
            Creating the team makes them its admin. There&apos;s no
            &quot;pick your role&quot; dropdown anywhere in the product,
            because letting a self-signed-in user grant themselves admin
            is a security smell.
          </p>
          <p>
            I borrowed this from Linear, Notion, Slack, and Asana — all
            of them treat workspace creator as admin and require every
            other member to arrive via an invite that specifies the
            role. The <code>/team/manage</code> page (admin-gated) lets
            admins promote or demote teammates after the fact.
          </p>
        </Decision>

        <Decision title="I built the inbox reply-first, not accept-first.">
          <p>
            The default action on an inbox card is{" "}
            <span className="font-medium text-foreground">Reply</span>,
            not Accept. I thought about the behaviour: when a teammate
            sends me a task, the first thing I usually want to ask is
            &quot;why me?&quot; or &quot;by when?&quot;. Forcing an
            Accept before a Reply would either accept tasks I
            haven&apos;t agreed to or, more likely, leave a stale inbox
            because people don&apos;t want to commit silently.
          </p>
          <p>
            Snooze sits next to Reply with explicit wake times (Tomorrow
            9am, Next Monday, Friday, In a week). I didn&apos;t want a
            &quot;remind me later&quot; that disappears into a black
            hole.
          </p>
        </Decision>

        <Decision title="I moved workflow status off tasks and onto projects.">
          <p>
            I shipped workflow status (Draft, In progress, Waiting
            approval, Approved, Live) on tasks first. It immediately
            conflicted with the todo/done checkbox and added a second
            status indicator in the drawer header. Pure noise.
          </p>
          <p>
            I moved it to projects, where it actually answers the
            question: &quot;is this piece of work approved to ship.&quot;
            Tasks stay binary (open vs done). One indicator per row,
            one indicator per project. Density without overlap.
          </p>
        </Decision>

        <Decision title="I consolidated three sidebar sections into one right rail.">
          <p>
            My first pass had Today, Team Pulse, and Recent Activity as
            three separate sidebar sections. The sidebar got crowded
            and the canvas felt small. I rebuilt them into a single
            right-rail card with hairline dividers and moved Team Pulse
            out of the left sidebar entirely. Two columns of attention
            instead of three.
          </p>
        </Decision>

        <Decision title="I made the task drawer a floating panel, not a route.">
          <p>
            Opening a task could have been a <code>/tasks/[id]</code>{" "}
            route. Instead I made it a floating panel anchored from the
            right, inset from the edges, with a Vaul-style slide curve.
            The benefit: I stay in my context (the list I came from),
            the drawer URL is shareable via{" "}
            <code>?task=&lt;id&gt;</code>, and Escape closes it without
            losing my scroll position.
          </p>
        </Decision>

        <Decision title="I let self-assigned tasks skip the inbox.">
          <p>
            If I create a task and assign it to myself, it lands
            straight in My Work. No triage step. Triage exists to let
            me decide whether to accept work from someone else; it
            would be silly to triage my own work.
          </p>
        </Decision>

        <Decision title="I made the parser visible — chips light up as you type.">
          <p>
            Loop reads tokens like <code>#project @name p1 tomorrow</code>{" "}
            inline. First version just stripped them silently and
            hoped you trusted it. Now chips appear above the input
            as each one is recognised, plus a small &quot;Saved as: …&quot;
            preview of the final title.
          </p>
          <p>
            The chips double as a tutorial — typing{" "}
            <code>#plat</code> makes a project chip appear, which
            teaches the syntax better than a help doc ever could.
            Borrowed from Todoist.
          </p>
        </Decision>

        <Decision title="Comments thread one level deep — no nested arguments.">
          <p>
            Long task discussions in a flat list become a wall of
            text. I borrowed Slack&apos;s model: each top-level
            comment can hold a reply chain, collapsed by default with
            a &quot;N replies&quot; pill that peeks the latest
            replier&apos;s avatar.
          </p>
          <p>
            One level deep on purpose — nobody wants a 5-level
            nested argument in their task tracker.
          </p>
        </Decision>

        <Decision title="I moved search and notifications to the top bar.">
          <p>
            They lived in the sidebar header at first. When the
            sidebar collapsed, both disappeared. I moved them to a
            sticky top bar so they&apos;re always visible, and the
            sidebar went back to being just navigation. Two jobs,
            two places.
          </p>
        </Decision>

        <Decision title="I removed every keyboard shortcut.">
          <p>
            I had ⌘K, Q, and ? wired up early on. Then I thought
            about who actually uses Loop: internal team members,
            not Linear power users. Shortcuts crowd the UI with key
            chips and add a hidden layer of how-to. So I cut all of
            them. The visible search box and the Add task button do
            the same jobs, more discoverably.
          </p>
        </Decision>

        <Decision title="I gave filtered empty states their own message.">
          <p>
            If I filter inbox by <code>@Priya</code> and see &quot;All
            caught up,&quot; that&apos;s a lie — the inbox isn&apos;t
            empty, the filter is. I made the empty state aware of
            filters: when one is active, the message becomes &quot;No
            tasks match this filter&quot; with a one-click Clear button.
            Tiny detail, big difference in trust.
          </p>
        </Decision>

        <Decision title="I surfaced collaborators with a tiny +N pip.">
          <p>
            A task can have one owner and multiple collaborators.
            But the row was only showing the owner&apos;s avatar — so
            you couldn&apos;t tell which tasks had more people on
            them at a glance. I added a small <code>+N</code> pip in
            the corner of the primary avatar. No extra space taken,
            the information is just there when you need it.
          </p>
        </Decision>

        <Decision title="No widows, anywhere — set as a global rule.">
          <p>
            One screenshot showed an empty-state hint ending with
            &quot;now.&quot; on its own line. Instead of fixing that
            paragraph, I made it a global rule: every paragraph and
            heading in the app now auto-corrects to avoid orphan
            words on the last line. Small detail you only notice
            when it&apos;s broken.
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
        <Decision title="Stack: Next.js 16 + Supabase + Tailwind v4.">
          <p>
            Next.js 16 with the App Router gives me server components,
            server actions, and middleware-based auth gating — so I
            don&apos;t have to wire auth myself. Supabase is the BaaS:
            Postgres with RLS, hosted auth (Google + magic link),
            realtime over websockets. Tailwind v4 keeps styling in the
            markup; OKLCH tokens in <code>globals.css</code> stay
            perceptually consistent across themes.
          </p>
          <p>
            The alternative was Node + Prisma + custom auth. Day one
            would have gone to plumbing. The brief ranks UX first, so I
            picked the path that ships features fast and saves the
            polish budget for the surfaces a reviewer actually touches.
          </p>
        </Decision>

        <Decision title="Teams model: one team per user, enforced in the DB.">
          <p>
            The brief says &quot;users can be assigned tasks only within
            their team,&quot; so I decided each user belongs to exactly
            one team. A unique index on{" "}
            <code>team_members(user_id)</code> enforces it in the
            database. The user never sees a team switcher, never gets a
            &quot;which team is this in?&quot; question, and never
            spills tasks across teams.
          </p>
          <p>
            Multi-team membership would have meant a switcher in the
            header, every query scoped to &quot;current team&quot;
            instead of &quot;my team,&quot; a context provider, and
            edge cases like &quot;what does Inbox mean if I&apos;m on
            three teams?&quot;. For a 2-day build, none of that pays
            off. The decision is reversible later — the schema supports
            multi-team if I drop the unique index.
          </p>
        </Decision>

        <Decision title="Roles: admin and member, enforced at the database.">
          <p>
            <code>team_members.role</code> is either{" "}
            <code>&apos;admin&apos;</code> or{" "}
            <code>&apos;member&apos;</code>. Admins can add/remove team
            members and change other roles; members cannot. The check
            lives in RLS via an <code>is_team_admin(team_id)</code>{" "}
            function. An app-code check alone would be bypassable; the
            database refuses the write.
          </p>
          <p>
            The <code>/team/manage</code> page is server-side gated. A
            member who hits the URL gets redirected to{" "}
            <code>/team</code>. Even if someone reaches the form, RLS
            refuses the write.
          </p>
        </Decision>

        <Decision title="Auth: Supabase + Google OAuth + four seeded demo accounts.">
          <p>
            Real auth, not a fake password gate. Reviewers can sign in
            with Google or with one of four seeded demo accounts (admin
            and member per team) and see role isolation in seconds. The
            demo credentials live in the table at the bottom of this
            page — for a reviewer-facing demo I traded security theatre
            for speed.
          </p>
        </Decision>

        <Decision title="Region: Mumbai (ap-south-1).">
          <p>
            Default Supabase region is US-East. From Mumbai, round-trip
            is ~180ms. ap-south-1 brings it to ~67ms. Initial page
            loads and inline edits (rename, reassign, mark complete)
            feel measurably faster.
          </p>
        </Decision>

        <Decision title="Optimistic UI everywhere mutations happen.">
          <p>
            Every mutation — complete, delete, reassign, reschedule,
            pin, theme change — updates the client state first, then
            calls the server action inside a{" "}
            <code>startTransition</code>. If the server errors, the
            client rolls back and a toast surfaces the error. I built a
            shared <code>OptimisticDeletesProvider</code> so the row,
            the drawer, and the bulk-action bar all hide a deleted
            task in the same render cycle.
          </p>
          <p>
            The perceived latency of every action is &lt;16ms. Real
            network latency happens silently in the background.
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
          I used Claude Code as a build partner, not a designer. I
          made the product calls; Claude turned them into code. Here
          is one moment where that worked well, and one where I had
          to pull it back.
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
          I&apos;d sign in as an admin first to see the full surface,
          then switch to the same team&apos;s member account to feel
          the role gating. Each team has one of each.
        </p>
      </Prose>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
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
