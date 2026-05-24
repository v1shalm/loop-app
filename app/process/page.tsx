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
        <Decisions />
        <Screens />
        <SmallCalls />
        <Assumptions />
        <Tradeoffs />
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

// ── Key decisions ──────────────────────────────────────────────────────────

const DECISIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Inbox is reply-first, not accept-first.",
    body: (
      <>
        <p>
          When a teammate sends me a task, the first thing I want to
          do is ask &quot;why me?&quot;, not commit. So I made Reply
          the default action, where Accept usually sits. Accept
          comes after.
        </p>
        <p>
          Snooze sits next to Reply with explicit wake times
          (Tomorrow 9am, Next Monday, In a week). No black-hole
          &quot;remind me later.&quot;
        </p>
      </>
    ),
  },
  {
    title: "Workflow status lives on projects, not tasks.",
    body: (
      <>
        <p>
          Putting Draft / In progress / Approved on each task
          fights the done checkbox and adds a second status
          indicator next to the title.
        </p>
        <p>
          It belongs at the project level — that&apos;s where
          &quot;is this work approved to ship&quot; gets decided.
          Tasks stay binary.
        </p>
      </>
    ),
  },
  {
    title: "The parser shows its work.",
    body: (
      <>
        <p>
          Loop reads <code>#project @name p1 tomorrow</code> inline
          in quick add. Stripping the tokens silently and hoping
          the user trusts it is the easy path. I went the other
          way: chips appear above the input as each token resolves.
        </p>
        <p>
          The chips double as a tutorial — typing{" "}
          <code>#brand</code> makes the project chip appear. The
          product teaches its own syntax. Borrowed from Todoist.
        </p>
      </>
    ),
  },
  {
    title: "Comments thread one level deep.",
    body: (
      <p>
        Each top-level comment can hold a reply chain, collapsed by
        default with a &quot;N replies&quot; pill. One level on
        purpose — nobody wants a 5-deep nested argument in a task
        tracker.
      </p>
    ),
  },
  {
    title: "Self-assigned tasks skip the inbox.",
    body: (
      <p>
        Triage exists to decide whether to accept someone
        else&apos;s work. Triaging your own work is silly.
      </p>
    ),
  },
  {
    title: "No keyboard shortcuts.",
    body: (
      <p>
        ⌘K, Q, and ? were wired early. Then I asked who actually
        uses Loop — internal team members, not Linear power users. I
        cut all of them. The visible search box and the Add task
        button do the same jobs, more discoverably.
      </p>
    ),
  },
  {
    title: "Filtered empty states say so.",
    body: (
      <p>
        Filtering inbox by <code>@Priya</code> and seeing &quot;All
        caught up&quot; is a lie. When a filter is active, the
        message becomes &quot;No tasks match this filter&quot; with
        a Clear button.
      </p>
    ),
  },
  {
    title: "Search and notifications in the top bar.",
    body: (
      <p>
        The sidebar header is the obvious spot. But the sidebar
        collapses, and the moment it does, both disappear. They go
        in a sticky top bar so they&apos;re always reachable.
      </p>
    ),
  },
  {
    title: "One right rail, not three sidebar widgets.",
    body: (
      <p>
        Today, Team Pulse, and Recent Activity are three pieces of
        the same job — telling you where the team is at. Three
        separate sidebar sections would crowd the main canvas.
        Folded into one card on the right rail instead. Two columns
        of attention, not three.
      </p>
    ),
  },
  {
    title: "Collaborators show as a +N pip.",
    body: (
      <p>
        A task can have one owner and several collaborators.
        Showing only the owner on the row hides the rest. A small{" "}
        <code>+N</code> in the corner of the avatar tells you the
        rest are there. No extra row width spent.
      </p>
    ),
  },
  {
    title: "@mentions in titles render as chips.",
    body: (
      <p>
        Most apps leave <code>@Priya</code> in a task title as plain
        text. I parse it against the team and render it as a small
        pink chip with the matched name. The mention reads as a
        person, not a string.
      </p>
    ),
  },
  {
    title: "No widows. Set as a global rule.",
    body: (
      <p>
        Saw a screenshot with &quot;now.&quot; dangling on its own
        line. Instead of fixing that paragraph, I made it global.
        Every prose block in the app self-corrects now.
      </p>
    ),
  },
];

function Decisions() {
  return (
    <Section title="Key decisions">
      <ol className="mt-2 flex max-w-[820px] flex-col gap-9 list-decimal pl-6 marker:text-[15px] marker:font-semibold marker:text-foreground/40">
        {DECISIONS.map((d, i) => (
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

// ── Trade-offs (AI + what I'd add next) ────────────────────────────────────

const NEXT_ITEMS = [
  "List / Board / Calendar toggle per project — same data, three lenses",
  "Inline title editing on rows so renaming doesn't need the drawer",
  "Trash with 30-day restore",
  "Filters live in the URL so a filtered view is shareable in Slack",
  "Project covers + emoji icons so projects look distinct in the sidebar",
  "Hover-preview cards on @mentions and task links",
];

function Tradeoffs() {
  return (
    <Section title="Trade-offs">
      <div className="mt-2 flex max-w-[820px] flex-col gap-8">
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            Where Claude helped.
          </h3>
          <div className="mt-2.5 flex flex-col gap-3 text-[16px] leading-relaxed text-muted-foreground">
            <p>
              I had the kanban structure decided — one column per
              project, white nested cards inside gray columns. First
              pass came back with flat project cards. I sent a quick
              screenshot. Next pass was right.
            </p>
            <p>
              Ten minutes instead of an hour. Claude is a multiplier
              on decisions you&apos;ve made, not a substitute for
              making them.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            Where I overrode.
          </h3>
          <div className="mt-2.5 flex flex-col gap-5 text-[16px] leading-relaxed text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">
                The colored-stripe reflex.
              </p>
              <p className="mt-1.5">
                I asked for an &quot;urgent&quot; treatment on
                overdue tasks. Claude reached for the classic AI
                move: a 3px colored bar on the left edge of every
                card. Generic. Doesn&apos;t scale once you have
                priority colors too. I cut it. Urgency reads through
                the date text turning rose and the priority flag
                color.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">
                Keyboard shortcuts wired by default.
              </p>
              <p className="mt-1.5">
                Claude wired up ⌘K, Q, and ? early — the &quot;obvious&quot;
                Linear patterns. Then I asked who actually uses
                Loop: internal team members, not power users who
                memorise shortcuts. I cut every one. The visible
                search box and Add task button do the same jobs
                without the key-chip litter, and the
                keyboard-shortcuts dialog went with them.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">
                The destructive confirm autofocused the destructive
                button.
              </p>
              <p className="mt-1.5">
                Claude defaulted the &quot;Delete this task?&quot;
                dialog to autofocus the red Delete button — faster
                to confirm, more accessible. But that means a
                stray Enter after the dialog opens deletes the
                task. I flipped it: destructive confirms autofocus
                Cancel; non-destructive ones still autofocus the
                primary. Same pattern as macOS.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground">
                Toasts that say &quot;Successfully X&quot;.
              </p>
              <p className="mt-1.5">
                Default toast voice was the friendly{" "}
                <em>&quot;Successfully completed your task!&quot;</em>
                . Sober tone for an internal tool. I rewrote every
                toast to be short and specific: &quot;Task
                added.&quot; &quot;Updated 3 tasks.&quot; &quot;Joined
                Engineering.&quot; No exclamations, no
                encouragement.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            What I&apos;d add next.
          </h3>
          <ul className="mt-2.5 flex flex-col gap-2">
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
        </div>
      </div>
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
