import Image from "next/image";
import Link from "next/link";
import {
  ArrowUp,
  CheckCircle,
} from "@/components/icons";
import { ForceLightTheme } from "./force-light";

export const metadata = {
  title: "Process · Loop",
  description:
    "Notes on the calls I made building Loop in two days for the Tist take-home.",
};

export default function ProcessPage() {
  return (
    <>
      <ForceLightTheme />
      <main className="mx-auto w-full max-w-[1040px] px-6 pb-32 pt-16 sm:px-10 sm:pt-24 lg:px-14">
        <Hero />
        <Thoughts />
        <Problems />
        <ClaudeHelped />
        <Overrides />
        <Screens />
        <SmallCalls />
        <Assumptions />
        <NextUp />
        <DemoAccounts />
        <Footer />
      </main>
    </>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mb-20">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Take-home · Tist · 2 days
      </p>
      <h1 className="mt-4 text-[56px] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground sm:text-[72px]">
        Loop
      </h1>
      <p className="mt-6 text-[19px] leading-relaxed text-muted-foreground sm:text-[20px]">
        A team task tracker. Built in two days for the Tist round-two
        take-home.
      </p>
      <p className="mt-3 text-[18px] leading-relaxed text-muted-foreground sm:text-[19px]">
        I made the product calls. Claude Code wrote the code.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="focus-ring surface-brand surface-brand-hover inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-[14.5px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
        >
          Try the app
          <ArrowUp size={14} weight="bold" className="rotate-45" />
        </Link>
        <a
          href="https://github.com/v1shalm/loop-app"
          target="_blank"
          rel="noreferrer"
          className="focus-ring inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-accent/40"
        >
          Source
        </a>
      </div>
    </section>
  );
}

// ── Thought process ────────────────────────────────────────────────────────

function Thoughts() {
  return (
    <Section title="Thought process">
      <Prose>
        <p>
          The brief said: build a task tracker for a mid-sized
          organisation with multiple teams, in two days, any stack,
          AI tools encouraged.
        </p>
        <p>
          It also said evaluation ranks{" "}
          <span className="font-medium text-foreground">
            UX and design judgment first
          </span>
          , then architecture, then how I communicate the decisions.
        </p>
        <p>That told me where to spend the budget.</p>
      </Prose>
    </Section>
  );
}

// ── Problems I spotted ─────────────────────────────────────────────────────

const PROBLEMS = [
  "Most task apps push a new assignment straight into your day. Accept-first design treats every incoming task as agreed work.",
  "Workflow status (Draft, In progress, Approved) usually sits on tasks AND projects. It fights with the done checkbox and adds a second status in the header.",
  "@mentions in task titles stay as plain text. The person disappears into the words.",
  "Long comment threads turn into walls because nothing is threaded.",
  "Filtered empty states say \"All caught up.\" That's a lie when the list isn't empty — the filter is.",
  "Notifications get their own page, but nobody visits it. A popover would do.",
  "Keyboard shortcuts crowd the UI with key-chip hints for users who'll never memorise them.",
];

function Problems() {
  return (
    <Section title="Problems I spotted">
      <Prose>
        <p>
          First thing I did: opened Asana, Linear, and Todoist
          back-to-back. Wrote down what felt wrong before I touched
          a single screen.
        </p>
      </Prose>
      <ul className="mt-6 flex max-w-[820px] flex-col gap-3.5">
        {PROBLEMS.map((p, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[16px] leading-relaxed text-muted-foreground"
          >
            <span
              aria-hidden
              className="mt-[10px] size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[16px] leading-relaxed text-muted-foreground">
        That was the start of the decision list.
      </p>
    </Section>
  );
}

// ── Where Claude helped ────────────────────────────────────────────────────

function ClaudeHelped() {
  return (
    <Section title="Where Claude helped">
      <Prose>
        <p>
          I had the kanban structure decided before I asked — one
          column per project, white nested task cards inside gray
          columns. First pass came back with flat project cards.
          One screenshot back, next pass was right.
        </p>
        <p>
          Ten minutes instead of an hour. Claude is a multiplier on
          decisions I&apos;ve already made, not a substitute for
          making them. The rest of this case study is the
          decisions.
        </p>
      </Prose>
    </Section>
  );
}

// ── Where I overrode ───────────────────────────────────────────────────────
//
// Almost every UI and UX call in Loop is a pushback on the obvious
// default. Each item below names what Claude (or the convention in
// the category) defaults to, what I went with instead, and why.

const OVERRIDES: { title: string; body: React.ReactNode }[] = [
  {
    title: "Inbox is reply-first, not accept-first.",
    body: (
      <>
        <p>
          The Linear / Asana convention puts <em>Accept</em> as the
          primary inbox action. That treats every new assignment as
          agreed work the moment you see it.
        </p>
        <p>
          I made <span className="font-medium text-foreground">Reply</span>{" "}
          the default. The first thing I usually want to do with a
          new task is ask &quot;why me?&quot; or &quot;by
          when?&quot;, not commit silently. Accept comes after.
          Snooze sits next to Reply with explicit wake times — no
          black-hole &quot;remind me later.&quot;
        </p>
      </>
    ),
  },
  {
    title: "Workflow status lives on projects, not tasks.",
    body: (
      <p>
        The default move is to put Draft / In progress / Approved on
        every task because that&apos;s where the work happens. It
        fights the done checkbox and adds a second status indicator
        next to every title. Workflow belongs at the project level
        — that&apos;s where &quot;is this approved to ship?&quot;
        gets decided. Tasks stay binary.
      </p>
    ),
  },
  {
    title: "Self-assigned tasks skip the inbox.",
    body: (
      <p>
        Every other tracker I&apos;ve used dumps your own
        self-assigned tasks into the inbox alongside everyone
        else&apos;s. But triage exists to decide whether to accept
        someone else&apos;s work — triaging your own is silly.
        Self-assigned tasks land straight in My Work.
      </p>
    ),
  },
  {
    title: "The parser shows its work.",
    body: (
      <>
        <p>
          Loop reads <code>#project @name p1 tomorrow</code> inline
          in quick add. The easy default is stripping tokens
          silently and hoping the user trusts it.
        </p>
        <p>
          I made the parser visible — chips light up above the
          input as each token resolves. Typing <code>#brand</code>{" "}
          makes the project chip appear, which teaches the syntax
          better than a help doc ever could. Borrowed from Todoist.
        </p>
      </>
    ),
  },
  {
    title: "Task drawer floats. It is not a route.",
    body: (
      <p>
        The instinctive React move is{" "}
        <code>/tasks/[id]</code> — a new page per task. That
        breaks your context every time you click a row. The drawer
        is a panel that slides in over the list. The URL still
        updates with <code>?task=</code> so a teammate can paste
        the link into Slack and land on the same view.
      </p>
    ),
  },
  {
    title: "Comments thread one level deep.",
    body: (
      <>
        <p>
          The two defaults in the category: flat comments (becomes
          a wall on a long task) or deeply-nested reply trees
          (becomes Reddit).
        </p>
        <p>
          One level is the Slack model and it&apos;s right for a
          task tracker. Each top-level comment can hold a reply
          chain, collapsed by default with a &quot;N replies&quot;
          pill. A DB trigger blocks replies-to-replies on purpose
          — nobody wants a 5-deep argument in their task tracker.
        </p>
      </>
    ),
  },
  {
    title: "Search and notifications in the top bar.",
    body: (
      <p>
        The obvious spot is the sidebar header — that&apos;s where
        Linear and Notion put them. But the sidebar collapses, and
        the moment it does, both disappear. They live in a sticky
        top bar so they&apos;re always reachable, and the sidebar
        goes back to being just navigation.
      </p>
    ),
  },
  {
    title: "One right rail, not three sidebar widgets.",
    body: (
      <p>
        Today, Team Pulse, and Recent Activity are three pieces of
        the same job: telling you where the team is at. Three
        separate sidebar sections crowd the main canvas. Folded
        them into one card on the right rail. Two columns of
        attention, not three.
      </p>
    ),
  },
  {
    title: "Collaborators show as a +N pip on the row.",
    body: (
      <p>
        A task can have one owner and several collaborators. Every
        app I tried shows only the owner&apos;s avatar on the row —
        the rest become invisible until you open the drawer. A
        small <code>+N</code> in the corner of the avatar makes the
        truth visible at row level without spending row width.
      </p>
    ),
  },
  {
    title: "@mentions in titles render as chips.",
    body: (
      <p>
        Most apps leave <code>@Priya</code> in a task title as
        plain text. The person disappears into the words. Loop
        parses the title against the team and renders matches as
        small pink chips. The mention reads as a person, not a
        string.
      </p>
    ),
  },
  {
    title: "Filtered empty states say so.",
    body: (
      <p>
        Default empty-state copy is &quot;All caught up&quot; or
        &quot;Nothing here.&quot; That&apos;s a lie when the list
        is actually filter-empty — the inbox isn&apos;t empty,
        your filter is. When a filter is active, the message
        becomes &quot;No tasks match this filter&quot; with a
        Clear button.
      </p>
    ),
  },
  {
    title: "No keyboard shortcuts.",
    body: (
      <>
        <p>
          Claude wired ⌘K, Q, and ? early — the obvious Linear
          patterns. Then I asked who actually uses Loop: internal
          team members, not power users who memorise shortcuts.
        </p>
        <p>
          I cut every one. The visible search box and the Add task
          button do the same jobs without the key-chip litter, and
          the keyboard-shortcuts dialog went with them.
        </p>
      </>
    ),
  },
  {
    title: "Destructive confirms autofocus Cancel.",
    body: (
      <p>
        Claude defaulted the &quot;Delete this task?&quot; dialog
        to autofocus the red Delete button — faster to confirm,
        more accessible. But that means a stray Enter after the
        dialog opens deletes the task. I flipped it: destructive
        confirms autofocus Cancel; non-destructive ones still
        autofocus the primary. Same pattern as macOS.
      </p>
    ),
  },
  {
    title: "Toasts that do not say &ldquo;Successfully X&rdquo;.",
    body: (
      <p>
        Default voice for status toasts was the friendly{" "}
        <em>&quot;Successfully completed your task!&quot;</em>{" "}
        cadence. Sober tone for an internal tool. Every toast is
        short and specific: &quot;Task added.&quot; &quot;Updated 3
        tasks.&quot; &quot;Joined Engineering.&quot; No
        exclamations, no encouragement.
      </p>
    ),
  },
  {
    title: "No colored side-stripe on overdue cards.",
    body: (
      <p>
        I asked for an &quot;urgent&quot; treatment on overdue
        tasks. Claude reached for the classic AI move: a 3px
        colored bar on the left edge of every card. Generic, and
        it doesn&apos;t scale once you have priority colors too. I
        cut it. Urgency reads through the date text turning rose
        and the priority flag color. Same signal, no decoration.
      </p>
    ),
  },
  {
    title: "No widows. Global rule.",
    body: (
      <p>
        Saw a screenshot with &quot;now.&quot; dangling on its own
        line — a typographic widow. Instead of fixing that one
        paragraph, I made it a global CSS rule. Every prose block
        in the app self-corrects now.
      </p>
    ),
  },
  {
    title: "Optimistic UI everywhere.",
    body: (
      <p>
        The default React pattern is fire the mutation, wait, then
        update. The user sees latency. Every mutation in Loop
        lands instantly on the client; the server reconciles in
        the background. If it errors, I roll back and surface a
        toast. Perceived latency under 16ms, regardless of the
        network.
      </p>
    ),
  },
  {
    title: "Onboarding is one form, not a wizard.",
    body: (
      <p>
        Most SaaS apps onboard with a 4-step wizard: welcome,
        workspace name, invite teammates, choose template. For an
        internal tool, that&apos;s ceremony. New users land on a
        single page that asks for a team name. Creating the team
        makes them its admin. Done.
      </p>
    ),
  },
];

function Overrides() {
  return (
    <Section title="Where I overrode">
      <Prose>
        <p>
          Almost every UI and UX call in Loop is a pushback on the
          obvious default — what Claude would have shipped without
          my direction, or what every other tracker in the category
          already does. The list below.
        </p>
      </Prose>
      <ol className="mt-7 flex max-w-[820px] flex-col gap-9 list-decimal pl-6 marker:text-[15px] marker:font-semibold marker:text-foreground/40">
        {OVERRIDES.map((d, i) => (
          <li key={i} className="pl-2">
            <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
              {d.title}
            </h3>
            <div className="mt-2.5 flex flex-col gap-3 text-[16px] leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[14px] [&_code]:font-medium [&_code]:text-foreground">
              {d.body}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── Screens (dark only) ────────────────────────────────────────────────────

const SCREENS: Array<{ name: string; alt: string; caption: string }> = [
  {
    name: "my-work",
    alt: "My work page with greeting, today's tasks, and right rail",
    caption:
      "My Work, the first screen after sign-in. Tasks grouped by urgency, not stacked into one list.",
  },
  {
    name: "inbox",
    alt: "Empty inbox with the metallic pedestal illustration",
    caption:
      "Empty inbox. CTA, secondary, three orientation tips. Empty states earn their canvas.",
  },
  {
    name: "projects-board",
    alt: "Kanban-style project board with gray columns and white task cards",
    caption:
      "Projects side by side as columns. Easier to scan across when you're planning a week than a flat list of project pages.",
  },
  {
    name: "task-drawer",
    alt: "Floating task drawer with title, chips, description, metadata, threaded comments",
    caption:
      "Opening a task slides this drawer in instead of taking you to a new page. The URL still updates with ?task= so the view stays shareable.",
  },
  {
    name: "manage-team",
    alt: "Admin-only manage team page with invite form and member list",
    caption:
      "Admin-only. Members can't reach this page at all, so they never see options they can't use.",
  },
];

function Screens() {
  return (
    <Section title="The interface">
      <div className="mt-2 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-2 sm:px-4">
          {SCREENS.map((s) => (
            <ScreenFrame key={s.name} {...s} />
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Small calls ────────────────────────────────────────────────────────────

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
    name: "thread-expanded",
    alt: "Task drawer comment with a reaction and a Reply affordance",
    caption: "Comments take reactions and threaded replies.",
  },
];

function SmallCalls() {
  return (
    <Section title="Small calls">
      <Prose>
        <p>
          The moments you don&apos;t see in a list-view tour: a
          dialog open, a popover, a comment with a reaction.
        </p>
      </Prose>
      <div className="mt-6 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-2 sm:px-4">
          {SMALL_CALLS.map((s) => (
            <ScreenFrame key={s.name} {...s} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function ScreenFrame({
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
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.04] p-2.5 shadow-soft-xs">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-soft-sm">
          <Image
            src={`/screens/dark/${name}.png`}
            alt={alt}
            width={1440}
            height={880}
            className="block h-auto w-full"
            unoptimized
          />
        </div>
      </div>
      <figcaption className="mx-auto max-w-[720px] px-2 text-center text-[15px] leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

// ── Assumptions (ambiguities the brief left to me) ─────────────────────────

function Assumptions() {
  return (
    <Section title="Assumptions">
      <Prose>
        <p>
          The brief left three things ambiguous on purpose. Here&apos;s
          what I picked, and what it cost.
        </p>
      </Prose>

      <ol className="mt-6 flex max-w-[820px] flex-col gap-8 list-decimal pl-6 marker:text-[15px] marker:font-semibold marker:text-foreground/40">
        <li className="pl-2">
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            One team per user.
          </h3>
          <div className="mt-2.5 flex flex-col gap-3 text-[16px] leading-relaxed text-muted-foreground">
            <p>
              Enforced with a unique constraint on{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[14px] font-medium text-foreground">
                team_members(user_id)
              </code>
              . No team switcher in the header, no &quot;which team
              is this in?&quot; ambiguity.
            </p>
            <p>
              Multi-team would have meant a switcher, current-team
              context, and edge cases like &quot;what does Inbox
              mean across three teams?&quot;. Not worth it for a
              2-day build.
            </p>
          </div>
        </li>

        <li className="pl-2">
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            Supabase for everything.
          </h3>
          <p className="mt-2.5 text-[16px] leading-relaxed text-muted-foreground">
            Postgres + RLS + magic link + Google OAuth +
            email/password + realtime, all in one. Removed a full
            day of plumbing. The day went into the surfaces a
            reviewer touches.
          </p>
        </li>

        <li className="pl-2">
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            Real auth, not a fake password gate.
          </h3>
          <p className="mt-2.5 text-[16px] leading-relaxed text-muted-foreground">
            Four demo accounts seeded (admin and member per team).
            Credentials are in the table at the bottom of this page.
            A reviewer signs in as any role in seconds.
          </p>
        </li>
      </ol>
    </Section>
  );
}

// ── What I'd add next ───────────────────────────────────────────────────────

const NEXT_ITEMS = [
  "List / Board / Calendar toggle per project — same data, three lenses",
  "Inline title editing on rows so renaming doesn't need the drawer",
  "Trash with 30-day restore",
  "Filters live in the URL so a filtered view is shareable in Slack",
  "Project covers + emoji icons so projects look distinct in the sidebar",
  "Hover-preview cards on @mentions and task links",
];

function NextUp() {
  return (
    <Section title="What I'd add next">
      <ul className="mt-2 flex max-w-[820px] flex-col gap-2.5">
        {NEXT_ITEMS.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[16px] leading-relaxed text-muted-foreground"
          >
            <CheckCircle
              size={15}
              weight="fill"
              className="mt-1 shrink-0 text-primary/70"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── Demo accounts ──────────────────────────────────────────────────────────

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

      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60 text-left text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Team</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Password</th>
            </tr>
          </thead>
          <tbody className="text-[15px]">
            {DEMOS.map((d, i) => (
              <tr
                key={d.email}
                className={
                  i < DEMOS.length - 1
                    ? "border-b border-border/40"
                    : undefined
                }
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {d.email}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {d.team}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={
                      d.role === "Admin"
                        ? "inline-flex items-center rounded-md border border-violet-200/70 bg-violet-50 px-2 py-0.5 text-[12px] font-medium text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200"
                        : "inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground"
                    }
                  >
                    {d.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-[13.5px] text-muted-foreground">
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

// ── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 pt-10 text-[14px] text-muted-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p>Built in two days for the Tist round-two take-home.</p>
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
    <section className="mt-20 scroll-mt-8" id={id}>
      <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[820px] flex-col gap-4 text-[17px] leading-[1.6] text-foreground/85">
      {children}
    </div>
  );
}
