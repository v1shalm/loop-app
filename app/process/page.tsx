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
    "How I thought through Loop, the task tracker I built in two days for the Tist take-home.",
};

export default function ProcessPage() {
  return (
    <>
      <ForceLightTheme />
      <main className="mx-auto w-full max-w-[1040px] px-6 pb-32 pt-16 sm:px-10 sm:pt-24 lg:px-14">
        <Hero />
        <Thoughts />
        <WhoItsFor />
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

// ── Who it's for ───────────────────────────────────────────────────────────

function WhoItsFor() {
  return (
    <Section title="Who it's for">
      <Prose>
        <p>
          A teammate on a 5 to 50 person team that uses a shared task
          tracker every day. The job: see what&apos;s on my plate
          today, decide what to do with new requests as they come in,
          and get on with the work.
        </p>
        <p>
          The frustration with existing tools: they assume you&apos;ve
          accepted every task the moment it&apos;s assigned, hide
          updates on a notifications page nobody opens, and show two
          different &quot;is this finished?&quot; states on the same
          task.
        </p>
      </Prose>
    </Section>
  );
}

// ── Problems I spotted ─────────────────────────────────────────────────────

const PROBLEMS = [
  "Most tools auto-accept assignments for you. Someone drops a task on you and it's on your list for today, whether you agreed to it or not.",
  "The same task often shows two different \"is this finished?\" answers at once. People stop knowing which one to trust.",
  "Comments on a task pile up as one long list. Replies don't sit under what they're replying to, so any real back-and-forth becomes hard to follow.",
  "When you filter a list and nothing matches, most tools say \"All caught up.\" You're not. The filter is hiding the work.",
  "Notifications live on their own page. Nobody opens it, so updates pile up there and the team misses them.",
];

function Problems() {
  return (
    <Section title="Problems I spotted">
      <Prose>
        <p>
          With that person in mind, I opened Asana, Linear, and
          Todoist back-to-back and wrote down what gets in the way of
          that job. I didn&apos;t run interviews; two days didn&apos;t
          leave room. This is what I noticed from using these apps
          daily and putting them side by side.
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
          I&apos;m a product designer with enough coding background to
          read code and spot when something&apos;s wrong. Not enough
          to write it. Backend especially: schema design, SQL, RLS
          policies. Any of those would have stopped this project on
          day one.
        </p>
        <p>
          Claude Code did all of it. I described what I needed, read
          what came back, and pushed back where it was wrong. Same on
          the frontend. The first kanban pass had flat cards instead
          of nested ones, and one screenshot fixed it.
        </p>
        <p>
          What I noticed: it moved fast when I already had the
          decision and just needed it built. When I was vague, the
          output was generic. The thinking still had to happen on my
          side.
        </p>
      </Prose>
    </Section>
  );
}

// ── Where I overrode ───────────────────────────────────────────────────────

function Overrides() {
  return (
    <Section title="Where I overrode">
      <Prose>
        <p>
          Most of the work in Loop sits in this section. Claude&apos;s
          first pass kept reaching for the standard task-tracker
          patterns. I replaced them.
        </p>
        <p>
          New tasks land in an inbox, not your day, so accepting work
          is a choice. The task drawer slides over the list instead of
          opening a new route, with the URL still updating so a
          teammate can paste a link. @mentions render as clickable
          chips. Comments thread one level deep and take reactions.
          Notifications collapsed from a full page into a popover in
          the top bar. Workflow status moved off project cards because
          it was duplicating the done checkbox. Filtered empty states
          name the filter that&apos;s hiding the work, instead of
          claiming everything is done.
        </p>
      </Prose>
    </Section>
  );
}

// ── Screens (dark only) ────────────────────────────────────────────────────

const SCREENS: Array<{ name: string; alt: string; caption: string }> = [
  {
    name: "my-work",
    alt: "My work page with greeting, today's tasks, and right rail",
    caption:
      "My Work is the first screen after sign-in. Tasks are grouped by when they're due, not piled into one list.",
  },
  {
    name: "inbox",
    alt: "Empty inbox with the metallic pedestal illustration",
    caption:
      "Empty inbox with one clear action, a fallback, and three quick tips. It's the first thing a new user sees, so it gets real layout instead of a placeholder.",
  },
  {
    name: "projects-board",
    alt: "Kanban-style project board with gray columns and white task cards",
    caption:
      "Projects as columns side by side. Easier to scan across when you're planning a week than clicking through a list of project pages.",
  },
  {
    name: "task-drawer",
    alt: "Floating task drawer with title, chips, description, metadata, threaded comments",
    caption:
      "Opening a task slides this drawer in instead of taking you to a new page. The URL still updates with ?task= so a teammate can paste a link.",
  },
  {
    name: "manage-team",
    alt: "Admin-only manage team page with invite form and member list",
    caption:
      "Admin-only. Members can't reach this page, so they never see options they can't use.",
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
    caption:
      "Type a task. Chips above the field light up as the tool recognises a project, person, date, or priority. You learn the patterns by using them.",
  },
  {
    name: "notifications-popover",
    alt: "Notifications popover open from the top bar with Mark all read",
    caption:
      "Notifications open in place from the top bar. One list, one Mark all read, no detour.",
  },
  {
    name: "thread-expanded",
    alt: "Task drawer comment with a reaction and a Reply affordance",
    caption:
      "Comments take reactions and one level of threaded replies. Enough for a back-and-forth, not enough to fork the conversation.",
  },
];

function SmallCalls() {
  return (
    <Section title="Small calls">
      <Prose>
        <p>
          The moments a list-view tour skips: a dialog open, a popover,
          a comment with a reaction.
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
              Enforced at the database level. No team switcher in the
              header, no &quot;which team am I looking at right
              now?&quot; question.
            </p>
            <p>
              Multi-team would have meant a switcher, a sticky current
              team, and questions like &quot;what does Inbox mean
              across three teams?&quot;. Not worth it for a 2-day
              build.
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
            day of plumbing. That day went into the product instead.
          </p>
        </li>

        <li className="pl-2">
          <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
            Real auth, not a fake password gate.
          </h3>
          <p className="mt-2.5 text-[16px] leading-relaxed text-muted-foreground">
            Four demo accounts are seeded: one admin and one member on
            each team. Credentials are in the table at the bottom of
            this page, so you can sign in as any role without setup.
          </p>
        </li>
      </ol>
    </Section>
  );
}

// ── What I'd add next ───────────────────────────────────────────────────────

const NEXT_ITEMS = [
  "List / Board / Calendar toggle per project. Same tasks, three views.",
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
          Sign in as an admin to see the full app. Sign in as a member
          to see what role gating hides.
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
