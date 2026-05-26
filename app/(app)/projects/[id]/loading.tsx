import {
  SkeletonBar,
  SkeletonPageHeader,
  TaskRowSkeleton,
} from "@/components/skeletons";

/**
 * Single project skeleton. Mirrors /projects/[id]: progress block at
 * top, then a "card-of-cards" group with task rows inside. Same
 * geometry as the real page so the shell stays put while data lands.
 */
export default function ProjectLoading() {
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        {/* Progress block */}
        <section className="mb-8 rounded-2xl border border-border/60 bg-card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <SkeletonBar className="h-5 w-40" />
            <SkeletonBar className="h-3 w-16" delay={80} />
          </div>
          <SkeletonBar className="h-2 w-full rounded-full" delay={140} />
          <div className="mt-4 flex items-center gap-4">
            <SkeletonBar className="h-3 w-20" delay={200} />
            <SkeletonBar className="h-3 w-24" delay={260} />
            <SkeletonBar className="h-3 w-16" delay={320} />
          </div>
        </section>

        {/* Card-of-cards group with task rows inside */}
        <section className="mb-10 rounded-2xl bg-card/70 p-3">
          <div className="mb-3 flex items-center gap-2 px-1">
            <SkeletonBar className="size-5 rounded-md" delay={120} />
            <SkeletonBar className="h-4 w-32" delay={180} />
            <SkeletonBar className="ml-auto h-3 w-8" delay={240} />
          </div>
          <div className="flex flex-col gap-1.5">
            {[0.86, 0.72, 0.92, 0.64, 0.8, 0.74].map((w, i) => (
              <TaskRowSkeleton
                key={i}
                delay={i * 70}
                titleWidth={`${Math.round(w * 100)}%`}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
