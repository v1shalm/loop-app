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

export default function ProcessPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-6 pb-32 pt-16 sm:px-8 sm:pt-24">
      <Hero />
      <Brief />
      <WhatWeBuilt />
      <Screens />
      <Principles />
      <UXDecisions />
      <Decisions />
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
      <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
        A team task tracker built end-to-end in two days for the Tist
        round-two assignment. This page covers the product decisions,
        where AI helped, and where I overrode it.
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

// ── Brief ───────────────────────────────────────────────────────────────────

function Brief() {
  return (
    <Section title="The brief">
      <Prose>
        <p>
          Design and build a task management web app for a mid-sized
          organisation. Multiple teams, multiple users, different roles.
          Two days. Any stack. AI tools encouraged, but I own the output.
        </p>
        <p>
          Evaluation ranks UX and design judgment first, technical
          architecture second, decision communication third. The brief
          leaves the interesting calls ambiguous on purpose: how teams
          compose, where data lives, how AI fits in. Those calls are
          the real interview.
        </p>
      </Prose>
    </Section>
  );
}

// ── What we built ───────────────────────────────────────────────────────────

function WhatWeBuilt() {
  return (
    <Section title="What I built">
      <Prose>
        <p>
          Loop is a team task tracker with two teams, four demo accounts,
          role-gated admin tools, and live sync. The interface stays quiet
          on purpose: opinionated type, tinted neutrals, motion that
          decelerates instead of bouncing.
        </p>
      </Prose>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        <Feature
          icon={<Crosshair size={14} />}
          title="My work"
          body="Inbox, today, upcoming. Every task that lands on you, grouped by urgency."
        />
        <Feature
          icon={<Tray size={14} />}
          title="Inbox triage"
          body="Reply before accepting. Snooze with explicit wake times (no black hole)."
        />
        <Feature
          icon={<Folder size={14} />}
          title="Project board"
          body="Kanban-style columns per project with task cards inside. Workflow status moved here from tasks."
        />
        <Feature
          icon={<UsersThree size={14} />}
          title="Teams"
          body="Two teams, four accounts. RLS at the DB so a Design member can't see Engineering tasks."
        />
        <Feature
          icon={<Hash size={14} />}
          title="Natural-language add"
          body="Type #design @ravi p1 tomorrow inline. Parser resolves tokens into IDs."
        />
        <Feature
          icon={<PaperPlaneTilt size={14} />}
          title="Comments + realtime"
          body="Comments on tasks, undo on completion, presence dots on teammates."
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

// ── Screens ─────────────────────────────────────────────────────────────────

const SCREENS: Array<{ src: string; alt: string; caption: string }> = [
  {
    src: "/screens/login.png",
    alt: "Login page with four demo accounts in a 2x2 grid",
    caption: "Login. Four demo accounts so reviewers can compare roles in two clicks.",
  },
  {
    src: "/screens/my-work.png",
    alt: "My work page with greeting, today's tasks, and right rail",
    caption: "My work. Greeting, today's list, and a right rail with progress, team pulse, and activity.",
  },
  {
    src: "/screens/inbox.png",
    alt: "Inbox with filter chips and triage actions",
    caption: "Inbox. Filter chips, reply-first composer, snooze with explicit wake times.",
  },
  {
    src: "/screens/projects-board.png",
    alt: "Kanban-style project board with gray columns and white task cards",
    caption: "Projects. Kanban board, one column per project, white task cards stacked inside.",
  },
  {
    src: "/screens/task-drawer.png",
    alt: "Floating task drawer with title, chips, description, metadata, comments",
    caption: "Task drawer. Floats inset from the edges with the Vaul/SHOP slide curve.",
  },
  {
    src: "/screens/manage-team.png",
    alt: "Admin-only manage team page with invite form and member list",
    caption: "Manage team (admin only). Invite by email, change roles, remove members. RLS gates the writes.",
  },
];

function Screens() {
  return (
    <Section title="The interface">
      <Prose>
        <p>
          A few of the surfaces. The full app is one click away; these
          are here so the writeup stands on its own if you&apos;re
          skimming.
        </p>
      </Prose>
      <div className="mt-6 flex flex-col gap-5">
        {SCREENS.map((s) => (
          <ScreenFrame key={s.src} {...s} />
        ))}
      </div>
    </Section>
  );
}

function ScreenFrame({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.04] p-3 sm:p-4">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-soft-sm">
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
      <figcaption className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

// ── Design principles ──────────────────────────────────────────────────────

const PRINCIPLES: { rule: string; why: string }[] = [
  {
    rule: "Quiet defaults, loud only when it matters",
    why: "Reviewers should feel the product, not the chrome. Color and motion stay neutral until something is overdue, high-priority, or unread. Then they pop.",
  },
  {
    rule: "One screen, one job",
    why: "My work answers \"what do I do today.\" Inbox answers \"what wants my attention.\" Projects answers \"where does this work live.\" If two screens started to answer the same question, I picked one and redirected the other.",
  },
  {
    rule: "Empty states earn their canvas",
    why: "Every blank list teaches the interface. Primary CTA, secondary action, and three short tips of what this page will do once it has data. No \"nothing here\" walls.",
  },
  {
    rule: "Triage is a step, not a default",
    why: "A task assigned by someone else lands in Inbox until you decide what to do with it. Accept, reply, or snooze with a visible wake time. Nothing pushed silently into your day.",
  },
  {
    rule: "Optimistic edits, undoable in six seconds",
    why: "Checking a task off should feel instant. A toast with an Undo button stays visible for six seconds, which is the window I tested as long enough to catch a fat-finger and short enough to feel ephemeral.",
  },
  {
    rule: "No AI slop",
    why: "No colored side-stripes, no gradient text, no random rounded-icon tiles above every heading. If a pattern reads as \"AI made this,\" it goes.",
  },
];

function Principles() {
  return (
    <Section title="Design principles">
      <Prose>
        <p>
          These are the rules I held myself to. When a decision came up
          mid-build, I asked which principle applied first and let that
          shape the call. Listing them here so the decisions further
          down read in context.
        </p>
      </Prose>
      <ul className="mt-6 flex flex-col gap-3">
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
          Each one started from a principle above.
        </p>
      </Prose>
      <div className="mt-6 flex flex-col gap-5">
        <Decision title="First one in is the admin. Nobody picks their own role.">
          <p>
            When a new user signs in and has no team yet, they land on
            /onboarding and create a team. Creating the team makes them
            its admin. There is no &quot;pick your role&quot; dropdown
            anywhere in the product, because letting a self-signed-in
            user grant themselves admin is a security smell.
          </p>
          <p>
            This is the convention Linear, Notion, Slack, and Asana all
            share: workspace creator = admin by default; every other
            member arrives via an invite that specifies the role. The
            existing /team/manage page (admin-gated) lets admins
            promote or demote teammates after the fact.
          </p>
        </Decision>

        <Decision title="Inbox reply-first, not accept-first">
          <p>
            The default action on an inbox card is{" "}
            <span className="font-medium text-foreground">Reply</span>,
            not Accept. The reason is behavioural: when a teammate sends
            you a task, the first thing you usually want to say is
            &quot;why me?&quot; or &quot;by when?&quot;. Forcing an
            Accept before a Reply would either accept tasks you
            haven&apos;t agreed to or, more likely, leave a stale inbox
            because people don&apos;t want to commit silently.
          </p>
          <p>
            Snooze sits next to Reply with explicit wake times (Tomorrow
            9am, Next Monday, Friday, In a week). No black-hole
            &quot;remind me later&quot; that disappears forever.
          </p>
        </Decision>

        <Decision title="Workflow status lives on projects, not tasks">
          <p>
            I shipped workflow status (Draft, In progress, Waiting
            approval, Approved, Live, etc.) on tasks first. It conflicted
            with the todo/done checkbox and added a second status
            indicator in the drawer header. Pure noise.
          </p>
          <p>
            I moved it to projects, where it actually answers the
            question: &quot;is this piece of work approved to ship.&quot;
            Tasks stay binary (open vs done). One indicator per row,
            one indicator per project. Density without overlap.
          </p>
        </Decision>

        <Decision title="One consolidated right rail, not three sidebar sections">
          <p>
            First pass had Today, Team Pulse, and Recent activity as
            three separate sidebar sections. The sidebar got crowded
            and the canvas felt small. I consolidated all three into a
            single right-rail card with hairline dividers and moved
            Team Pulse out of the left sidebar entirely (when expanded).
            Two columns of attention instead of three.
          </p>
        </Decision>

        <Decision title="Floating task drawer, not full-page route">
          <p>
            Opening a task could have been a /tasks/[id] route. Instead
            it&apos;s a floating panel anchored from the right, inset
            from the edges with a Vaul-style slide curve. The benefit:
            you stay in your context (the list you came from), the
            drawer URL is shareable via ?task=, and Escape closes it
            without losing your scroll position.
          </p>
        </Decision>

        <Decision title="Self-assigned tasks skip the inbox">
          <p>
            If I create a task and assign it to myself, it lands
            straight in My work. No triage step. The triage step exists
            to let me decide whether to accept work from someone else;
            it would be silly to triage my own work.
          </p>
        </Decision>

        <Decision title="No colored hairlines on cards">
          <p>
            The most overused AI design tell is a 3px colored bar on
            the left edge of every card. It signals nothing meaningful
            (just &quot;this row is here&quot;) and it scales badly
            (every priority, project, or status fights for its own
            stripe). Loop signals urgency through the date text turning
            rose and through the priority flag color. Same information,
            none of the decoration.
          </p>
        </Decision>

        <Decision title="Filter chips with live counts, not a filter modal">
          <p>
            Inbox filters (All, Unread, High, Snoozed) are visible at
            all times with live counts next to each. A filter modal
            would have hidden the option to filter by High the moment
            a P1 task arrives. Visible counts also act as a status
            indicator: &quot;Unread 0&quot; tells you you&apos;ve seen
            everything.
          </p>
        </Decision>
      </div>
    </Section>
  );
}

// ── Decisions ───────────────────────────────────────────────────────────────

function Decisions() {
  return (
    <Section title="Architecture decisions">
      <div className="mt-2 flex flex-col gap-5">
        <Decision title="Stack: Next.js 16 + Supabase + Tailwind v4">
          <p>
            Next.js 16 with the App Router gives me server components,
            server actions, and built-in middleware for auth gating, so
            I don&apos;t have to wire auth myself. Supabase is the BaaS:
            Postgres with RLS, hosted auth (Google and email/password),
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

        <Decision title="Teams model: one team per user">
          <p>
            The brief says &quot;users can be assigned tasks only within
            their team,&quot; so each user belongs to exactly one team. A
            unique index on <code>team_members(user_id)</code> enforces
            it in the database. The user never sees a team switcher,
            never gets a &quot;which team is this in?&quot; question, and
            never spills tasks across teams.
          </p>
          <p>
            Multi-team membership would have meant a switcher in the
            header, every query scoped to &quot;current team&quot; instead
            of &quot;my team,&quot; a context provider, and edge cases
            like &quot;what does Inbox mean if I&apos;m on three teams?&quot;
            For a 2-day build, none of that pays off.
          </p>
        </Decision>

        <Decision title="Roles: admin and member, enforced at the DB">
          <p>
            <code>team_members.role</code> is either{" "}
            <code>&apos;admin&apos;</code> or{" "}
            <code>&apos;member&apos;</code>. Admins can add and remove
            team members and change other roles; members cannot. The
            check lives in RLS via an{" "}
            <code>is_team_admin(team_id)</code> function. An app-code
            check alone would be bypassable; the database refuses the
            write.
          </p>
          <p>
            The /team/manage page is server-side gated. A member who hits
            the URL gets redirected to /team. Even if someone reaches
            the form, RLS refuses the write.
          </p>
        </Decision>

        <Decision title="Auth: Supabase + Google OAuth + four demo accounts">
          <p>
            Real auth, not a fake password gate. Reviewers can sign in
            via Google or pick one of four seeded demo accounts (admin
            and member per team) and see role isolation in two clicks.
          </p>
        </Decision>

        <Decision title="Region: Mumbai (ap-south-1)">
          <p>
            Default Supabase region is US-East. From Mumbai, round-trip
            is ~180ms. ap-south-1 brings it to ~67ms. Initial page loads
            and inline edits (rename, reassign, mark complete) feel
            faster.
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
    <Section title="AI in the loop">
      <Prose>
        <p>
          I used Claude Code throughout: scaffolding routes, writing SQL
          migrations, drafting empty states. It sped up the mechanical
          parts. It also tried to ship things I had to push back on.
        </p>
      </Prose>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SplitCard
          tone="win"
          tag="Where AI helped"
          title="The kanban board, sketched in 10 minutes"
        >
          <p>
            When I asked for a project-as-column / task-as-card view,
            the first pass came back with the wrong abstraction: flat
            project cards instead of nested cards. I sent one screenshot
            back. The next pass had the correct structure: gray columns,
            white nested cards, status icon and tag chip in the footer.
          </p>
          <p>
            An hour of layout fiddling became ten minutes of
            conversation. The pattern: describe the visual grammar
            precisely once, then iterate via screenshots, not text.
          </p>
        </SplitCard>

        <SplitCard
          tone="override"
          tag="Where I overrode"
          title="The colored-stripe AI-slop reflex"
        >
          <p>
            When I asked for an &quot;urgent&quot; visual treatment on
            overdue tasks, AI reached for the side-stripe: a 3px colored
            bar on the left edge of every card. That&apos;s the most
            overused AI design tell, and my rules ban it.
          </p>
          <p>
            I called it out:{" "}
            <span className="font-medium text-foreground">
              no colored hairlines, no AI slop
            </span>
            . The fix signals urgency through the date text turning rose
            and through the priority flag color. Same information, none
            of the decorative noise.
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
          ? "flex flex-col gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5"
          : "flex flex-col gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 p-5"
      }
    >
      <p
        className={
          tone === "win"
            ? "text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-700"
            : "text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-700"
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
  { name: "Alex Chen", team: "Design", role: "Admin", email: "alex@loop.app", pw: "alex-loop-2026" },
  { name: "Mia Patel", team: "Design", role: "Member", email: "mia@loop.app", pw: "mia-loop-2026" },
  { name: "Ravi Kumar", team: "Engineering", role: "Admin", email: "ravi@loop.app", pw: "ravi-loop-2026" },
  { name: "Priya Shah", team: "Engineering", role: "Member", email: "priya@loop.app", pw: "priya-loop-2026" },
];

function DemoAccounts() {
  return (
    <Section title="Demo accounts">
      <Prose>
        <p>
          Sign in with any of these to see that role and team. The login
          page lists the same accounts for two-click switching.
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
                <td className="px-4 py-2.5 text-muted-foreground">{d.team}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      d.role === "Admin"
                        ? "inline-flex items-center rounded-md border border-violet-200/70 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
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
  "Subtasks (parent_task_id + nested rows in the drawer)",
  "Bulk select + bulk reassign / reschedule",
  "Recurring tasks for standups, weekly reports",
  "Mobile pass: sidebar collapses, drawer becomes a bottom sheet",
  "Streaks + a Friday digest email",
];

function NextUp() {
  return (
    <Section title="What I&apos;d ship next">
      <Prose>
        <p>
          Two days meant cutting things I wanted. In priority order:
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
          Built in two days for the Tist round-two take-home. November 2025.
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-[14.5px] leading-[1.65] text-foreground/80">
      {children}
    </div>
  );
}
