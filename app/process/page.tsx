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
        round-two assignment. This page is the writeup — every product
        decision, what the AI was good at, and where I had to override it.
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

      <p className="mt-6 text-[12.5px] text-muted-foreground">
        Vishal Maurya · Mumbai · jayashree@pixeldust.in
      </p>
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
          Evaluation: UX & design judgment first, technical architecture
          second, decision communication third. The brief left several
          things deliberately ambiguous — how teams compose, where data
          lives, how AI got used. Those calls were the actual interview.
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
          role-gated admin tools, and real-time sync. The interface tries
          to feel quiet — opinionated typography, a tinted neutral palette,
          and motion that decelerates instead of bouncing.
        </p>
      </Prose>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        <Feature
          icon={<Crosshair size={14} />}
          title="My work"
          body="Inbox, today, upcoming — every task that lands on you, grouped by urgency."
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

// ── Decisions ───────────────────────────────────────────────────────────────

function Decisions() {
  return (
    <Section title="Decisions, with reasons">
      <div className="mt-2 flex flex-col gap-5">
        <Decision title="Stack: Next.js 16 + Supabase + Tailwind v4">
          <p>
            Next.js 16 with the App Router gives me server components,
            server actions, and a built-in proxy (middleware) for auth gating
            — no need to glue together my own. Supabase is the BaaS: Postgres
            with RLS, hosted auth (Google + email/password), realtime over
            websockets. Tailwind v4 keeps styling in the markup, OKLCH tokens
            in <code>globals.css</code> stay perceptually consistent.
          </p>
          <p>
            The alternative was a Node + Prisma + custom-auth stack. I would
            have spent the first day on plumbing instead of UX. The brief
            ranks UX first, so I picked the path that lets me ship
            features fast and put the polish budget into the surfaces a
            reviewer actually touches.
          </p>
        </Decision>

        <Decision title="Teams model: one team per user">
          <p>
            The brief says &quot;users can be assigned tasks only within
            their team&quot; — that line decides the model. I treated each
            user as belonging to exactly one team and enforced it at the DB
            with a unique index on{" "}
            <code>team_members(user_id)</code>. No team switcher, no
            cross-team task overflow, no &quot;which team is this in?&quot;
            question on every action.
          </p>
          <p>
            Multi-team membership would have been more flexible but it would
            have meant: a team-switcher UX in the header, every query
            scoped to &quot;current team&quot; rather than &quot;my team&quot;,
            a context provider, and edge cases (what does &quot;Inbox&quot;
            mean if I&apos;m on three teams?). For a 2-day build, that
            complexity has no payoff.
          </p>
        </Decision>

        <Decision title="Roles: admin and member, enforced at the DB">
          <p>
            <code>team_members.role</code> is{" "}
            <code>&apos;admin&apos;</code> or{" "}
            <code>&apos;member&apos;</code>. Admins can add or remove
            members from their team and change others&apos; roles; members
            cannot. The enforcement lives in RLS via an{" "}
            <code>is_team_admin(team_id)</code> function — not as a check
            in app code that an attacker could bypass.
          </p>
          <p>
            The /team/manage page is server-side gated: members hitting the
            URL directly get redirected to /team. Defense in depth — RLS
            stops the write even if someone shows the form.
          </p>
        </Decision>

        <Decision title="Auth: Supabase + Google OAuth + four demo accounts">
          <p>
            Real auth, not a fake password gate. Reviewers can sign in via
            Google or use one of four seeded demo accounts — admin and
            member per team — so role isolation is visible in two clicks
            without anyone juggling test fixtures.
          </p>
        </Decision>

        <Decision title="Region: Mumbai (ap-south-1)">
          <p>
            Default Supabase region is US-East. From Mumbai the round-trip
            is ~180ms; in ap-south-1 it&apos;s ~67ms. Initial page loads
            and any inline edit (rename, reassign, mark complete) feel
            noticeably snappier. The kind of detail no one notices when
            it&apos;s right and everyone notices when it isn&apos;t.
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
          I used Claude Code throughout — for scaffolding routes, writing
          SQL migrations, drafting empty states. It accelerated the
          mechanical parts. It also tried to ship things I had to push
          back on.
        </p>
      </Prose>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SplitCard
          tone="win"
          tag="Where AI helped"
          title="The kanban board, sketched in 10 minutes"
        >
          <p>
            When I asked for a project-as-column / task-as-card view, the
            first pass came back with a wrong abstraction — flat project
            cards instead of nested cards. I sent one screenshot back
            and got the correct structure (gray columns, white nested
            cards, status icon + tag chip in the footer) in the next pass.
          </p>
          <p>
            What would have taken me an hour of layout fiddling was 10
            minutes of conversation. The pattern: describe the visual
            grammar precisely once, iterate via screenshots, not text.
          </p>
        </SplitCard>

        <SplitCard
          tone="override"
          tag="Where I overrode"
          title="The colored-stripe AI-slop reflex"
        >
          <p>
            When I asked for an &quot;urgent&quot; visual treatment on
            overdue tasks, AI&apos;s first instinct was the side-stripe
            pattern — a 3px colored bar on the left edge of every card.
            That&apos;s the most-overused AI design tell, banned in my
            design rules.
          </p>
          <p>
            I called it out explicitly:{" "}
            <em className="not-italic font-medium text-foreground">
              no colored hairlines, no AI slop
            </em>
            . The fix: signal urgency through the date text turning rose
            and the priority flag color — same information, none of the
            decorative noise.
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
          Sign in with any of these to see what that role / team sees.
          Listed on the login page too — two-click switching for reviewers.
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
  "Mobile pass — sidebar collapses, drawer becomes a bottom sheet",
  "Streaks + a Friday digest email",
];

function NextUp() {
  return (
    <Section title="What I&apos;d ship next">
      <Prose>
        <p>
          A 2-day budget meant cutting things I wanted. In priority order:
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
