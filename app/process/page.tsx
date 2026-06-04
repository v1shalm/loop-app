import Image from "next/image";
import Link from "next/link";
import { CheckCircle } from "@/components/icons";
import { ForceLightTheme } from "./force-light";

export const metadata = {
  title: "Process · Loop",
  description:
    "How I thought through Loop, the task tracker I built in two days for the Tist take-home.",
  openGraph: {
    title: "Process · Loop",
    description:
      "How I thought through Loop, the task tracker I built in two days for the Tist take-home.",
    url: "https://loop-tist.vercel.app/process",
    images: [
      {
        url: "/screens/dark/task-drawer.png",
        width: 1440,
        height: 880,
        alt: "Loop task drawer slides over the list with threaded comments and reactions",
      },
    ],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Process · Loop",
    description:
      "How I thought through Loop, the task tracker I built in two days for the Tist take-home.",
    images: ["/screens/dark/task-drawer.png"],
  },
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
        <LookAndFeel />
        <Screens />
        <SmallCalls />
        <NextUp />
        <Footer />
      </main>
    </>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mb-20">
      <Image
        src="/loop-logo.svg"
        alt=""
        width={68}
        height={68}
        priority
        className="mb-6"
      />
      <h1 className="text-[56px] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground sm:text-[72px]">
        Loop
      </h1>
      <p className="mt-6 text-[20px] leading-relaxed text-muted-foreground sm:text-[20px]">
        A team task tracker.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="focus-ring surface-brand surface-brand-hover inline-flex h-11 items-center rounded-md px-5 text-[14px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
        >
          Try the app
        </Link>
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
          Every task tracker eventually becomes a junk drawer of
          forgotten assignments and noise. With two days to build
          one, the biggest risk is shipping{" "}
          <span className="font-medium text-foreground">
            a soulless clone of Todoist
          </span>
          .
        </p>
        <p>
          I wanted Loop to have a clear point of view: a tool for the
          person doing the work, not the manager tracking it.
        </p>
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
          With that person in mind, I pulled flows from Linear,
          Notion, and Todoist on Mobbin and walked through them side
          by side. I wrote down what gets in the way of that job.
        </p>
      </Prose>
      <ul className="mt-6 flex max-w-[820px] flex-col gap-3.5">
        {PROBLEMS.map((p, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[15px] leading-relaxed text-muted-foreground"
          >
            <span
              aria-hidden
              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
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
          to write it. Backend especially: database design, queries,
          access permissions. Any of that would have stopped this
          project on day one.
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

// ── Where I pushed back ────────────────────────────────────────────────────

const OVERRIDES: Array<{ title: string; body: string }> = [
  {
    title: "Inbox, not your day.",
    body: "New tasks land in an inbox until you accept them.",
  },
  {
    title: "Drawer, not a route.",
    body: "The task drawer slides over the list instead of loading a new page. The URL still updates, so a teammate can paste a link to land back on the same task.",
  },
  {
    title: "Notifications in place.",
    body: "Collapsed from a full page into a popover in the top bar. One list, one Mark all read, no detour.",
  },
];

function Overrides() {
  return (
    <Section title="Where I pushed back">
      <Prose>
        <p>
          Claude&apos;s first pass kept reaching for standard
          task-tracker patterns. Here&apos;s what I replaced them
          with:
        </p>
      </Prose>
      <ul className="mt-7 flex max-w-[820px] flex-col gap-7">
        {OVERRIDES.map((o, i) => (
          <li key={i}>
            <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
              {o.title}
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
              {o.body}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── Look, feel, and sound ──────────────────────────────────────────────────

function LookAndFeel() {
  return (
    <Section title="Look, feel, and sound">
      <Prose>
        <p>
          I wanted Loop to feel good to sit in front of all day. Thin
          borders, quiet shadows, and a brand blue that stands apart
          from Linear&apos;s purple, Notion&apos;s monochrome, and
          Todoist&apos;s red.
        </p>
        <p>
          Every action plays a short sound through{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[14px] font-medium text-foreground">
            @web-kits/audio
          </code>
          . Completing a task plays a chime pitched by priority. Small
          things, but they make the app feel tactile.
        </p>
      </Prose>
    </Section>
  );
}

// ── Screens (dark only) ────────────────────────────────────────────────────

const SCREENS: Array<{ name: string; alt: string; caption: string }> = [
  {
    name: "my-work",
    alt: "My Day page with greeting, today's tasks, and right rail",
    caption:
      "My Day is the first screen after sign-in. Tasks are grouped by when they're due, not piled into one list.",
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
      "Opening a task slides this drawer in instead of taking you to a new page. The URL still updates, so a teammate can paste a link to land back on the same task.",
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
      "Type a task. Chips above the field light up as Loop recognises a project, person, date, or priority. You learn the patterns by using them.",
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
      "Comments take reactions and one level of threaded replies. Enough for a back-and-forth, not enough to lose the thread.",
  },
];

function SmallCalls() {
  return (
    <Section title="Small calls">
      <div className="mt-2 ml-[calc(50%-50vw+8px)] mr-[calc(50%-50vw+8px)] max-w-none sm:ml-[calc(50%-50vw+16px)] sm:mr-[calc(50%-50vw+16px)]">
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

// ── What I'd add next ───────────────────────────────────────────────────────

const NEXT_ITEMS = [
  "List / Board / Calendar toggle per project. Same tasks, three views.",
  "Rename a task in the list without opening the drawer",
  "Trash with 30-day restore",
  "Filters live in the URL so a filtered view is shareable in Slack",
  "Project covers + emoji icons so projects look distinct in the sidebar",
  "Hover a name or task link to see a preview without leaving the page",
];

function NextUp() {
  return (
    <Section title="What I'd add next">
      <ul className="mt-2 flex max-w-[820px] flex-col gap-2.5">
        {NEXT_ITEMS.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-[15px] leading-relaxed text-muted-foreground"
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

// ── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 pt-10 text-center text-[14px] text-muted-foreground">
      <Link
        href="/login"
        className="text-foreground transition-colors hover:text-primary"
      >
        Try the app
      </Link>
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
      <h2 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[28px]">
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
