/**
 * Instant skeleton that renders the moment a sidebar nav link is clicked,
 * while the real RSC payload streams in. Sidebar + header stay mounted,
 * only the content slot swaps. Without this, every navigation feels frozen
 * because the user gets no visual feedback during the server round-trip.
 */
export default function AppLoading() {
  return (
    <div className="min-h-full">
      {/* Header placeholder — matches the 56px PageHeader */}
      <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background px-5">
        <div className="size-8 shrink-0 rounded-md bg-muted/60" />
        <div className="h-5 w-px bg-border" aria-hidden />
        <div className="h-5 w-32 rounded-md bg-muted/60" />
      </div>

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        <div className="mb-3 flex items-baseline justify-between border-b border-border/50 pb-2">
          <div className="h-4 w-24 rounded bg-muted/60" />
          <div className="h-3 w-10 rounded bg-muted/50" />
        </div>

        <div className="space-y-1">
          {[0.95, 1, 0.9, 0.85, 0.95, 0.8, 0.9].map((w, i) => (
            <TaskRowSkeleton key={i} width={w} delay={i * 60} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskRowSkeleton({ width, delay }: { width: number; delay: number }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-3"
      style={{
        animation: "loop-skeleton-fade 1.4s ease-out infinite",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="mt-0.5 size-[18px] shrink-0 rounded-full border-[1.5px] border-muted/70" />
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className="h-3.5 rounded bg-muted/60"
          style={{ width: `${width * 100}%` }}
        />
        <div className="h-3 w-32 rounded bg-muted/50" />
      </div>
    </div>
  );
}
