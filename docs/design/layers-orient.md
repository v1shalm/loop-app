# Layers Orient — Loop

Diagnostic run: 2026-05-24. Framework: [Layers of Product Design](https://layersofproductdesign.com) (Jamie Mill et al.).

This is a rapid audit across all seven layers to identify the **bottleneck** — the lowest layer with unresolved decisions that risks compromising everything above it.

---

## Situation

- **Product**: Loop — internal team task management tool for Pixeldust. Todoist-style mobile shell + desktop sidebar.
- **Stack**: Next.js 16 App Router, Supabase (Postgres + RLS + Realtime), Tailwind v4, Sileo toasts, Phosphor icons.
- **Stage**: Active product. Real data, multiple accounts (Vishal + Jayashree + others), production-ish.
- **Recent design work** (last ~2 weeks): v2 theme port from sister `resume-builder` app, mobile responsive shell, polished CTAs / layered surfaces, realtime "assigned to you" toasts, sileo toast contrast fix.
- **No design artefacts in repo**: no `docs/design/`, no job stories, no strategy doc, no conceptual-model write-up.

## Decision landscape

| Layer | State | Notes |
|---|---|---|
| Observed behaviour | **Assumed** | Designer is the primary user. No structured observation of teammates yet. N=1 — Vishal's intuition. |
| The domain | **Strong** | Task management is a well-mapped domain (Todoist, Linear, Asana, Things). Vocabulary is industry-conventional. |
| User needs | **Weak (tacit)** | Lives in the designer's head. No job stories, no shared articulation. Every recent surface decision rests on un-checkable intuition. |
| Product & service strategy | **Not started** | "Internal tool, no goal." No outcome metric, no opportunity scoring. Not necessarily wrong for a 2–3 person internal tool, but it means nothing distinguishes "should we build this" from "could we build this". |
| Conceptual model | **Partial** | Encoded in the Supabase schema (`workspaces`, `projects`, `tasks`, `task_assignees`, `comments`, `activity_events`, profile status, project lifecycle status). Some informal notes in `CLAUDE.md` / migration headers. No single coherent model description — the schema is the de facto model, with its choices implicit. |
| Interaction structure | **Partial** | Implemented and working: pages (Today, Inbox, Projects, Activity), task drawer via `?task=<id>`, sidebar nav, mobile bottom nav, FAB, menu sheet, toast actions. Not mapped anywhere. Recent churn (mobile shell, realtime, toast contrast) suggests live iteration without a flow map. |
| Surface | **Strong** | Mature design system: OKLCH tokens, dual-theme contrast, layered surfaces, `--shadow-cta` stack, polished Phosphor icon set, recent sileo override fixes. The layer most invested in. |

## Bottleneck

The lowest layer with weak / assumed state is **Observed behaviour**, but for an internal tool where the designer is a user, that's defensible — N=1 is genuine first-hand data, not a vacuum.

The **load-bearing bottleneck** is **User Needs**. Here's why:

1. Loop has at least two real users (Vishal + Jayashree, plus other Pixeldust teammates per the auth setup). The design has been built to one head — Vishal's — and that intuition is treated as a stand-in for shared needs.
2. Every recent surface decision (theme, mobile shell, toasts, notification timing, profile menu) was anchored to *aesthetic preference* — there's no statement like *"as a Pixeldust designer, I want X so that Y"* to test those choices against. That's why surface iterations have churned (v1 → v2, gradient try → revert, date picker spacing → revert).
3. The conceptual model is the most neglected load-bearing layer in most projects, and Loop's is **Partial** rather than Weak — the schema does real work — but it was shaped by what felt sensible, not by named needs. Without explicit user needs the model can drift in ways nobody notices until they bite (e.g. *should "assignee" really be a single primary plus a co-assignee list, or are those two distinct concepts? Was that ever a user-needs question, or a schema-convenience one?*).

**Strategy is also Not Started** but I'd flag it as the *second* priority. For a tiny internal tool with no external customer, "we want our team to use this instead of Todoist" is an acceptable shorthand — articulating it as a single sentence is enough; you don't need a full strategy tree yet.

## Assumed layers worth challenging

These are layers currently treated as solid that aren't actually verified:

- **Domain — "Strong"**: marked strong because the *industry* domain is well-mapped, but you haven't audited where *Pixeldust's specific workflow* deviates. Example: a design studio's task workflow has stages (brief → concept → review → sign-off → handoff) that don't appear in Loop's `workflow_status` enum. If your team's mental model doesn't fit the standard taxonomy, the surface will keep feeling slightly off.
- **Surface — "Strong"**: the system is robust, but it was polished against an *implicit* set of needs. A surface that fits unspoken assumptions about user needs is fragile — the moment needs become explicit, parts of the surface may need to move. Don't keep investing here until needs are written.

## Recommendation

Run **`/layers-user-needs`** next.

Why this one over `/layers-observed-behaviour`:

- Observed behaviour at N=1 isn't actually as broken as the table suggests — you use the product. The cheap upgrade (talk to Jayashree once) doesn't need a skill; it's a 30-minute conversation.
- What's missing is **articulation**: converting "lives in my head" into a small set of named job stories that the rest of the team can read, agree with, and use as a check. That's exactly the output `/layers-user-needs` is built to produce.
- Once user needs are explicit, two things unlock:
  - `/layers-product-strategy` becomes trivial (pick which needs the next sprint serves)
  - `/layers-conceptual-model` becomes pointed — does the schema actually serve these needs, or is it an artefact of "what felt sensible at midnight"?

After user-needs, the natural order is `/layers-product-strategy` (one paragraph, not a tree), then `/layers-conceptual-model` (audit the schema against named needs), then back to interaction + surface with a sharper rationale.

**Constraint to acknowledge**: you've been moving fast and shipping daily. A user-needs session done badly turns into a doc that gets written once and never re-read. Keep the output to a tight `docs/design/user-needs.md` with ≤8 job stories — small enough to actually live in the codebase.

---

*Next step: `/layers-user-needs`, or push back on this picture if anything reads wrong.*
