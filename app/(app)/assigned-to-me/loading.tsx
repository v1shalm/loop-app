import {
  SkeletonBar,
  SkeletonPageHeader,
  SkeletonRightRail,
  SkeletonSectionHeader,
  TaskRowSkeleton,
} from "@/components/skeletons";

/**
 * My Day skeleton. Mirrors the real /assigned-to-me layout: greeting
 * header + meta line, then a 1fr / 300px grid with one or two task
 * sections on the left and the right rail. Two sections in the
 * placeholder (Today + Overdue / Completed today) match the most
 * common state at first paint.
 */
export default function AssignedToMeLoading() {
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        {/* Greeting header */}
        <header className="mb-6">
          <SkeletonBar className="h-7 w-48" />
          <SkeletonBar className="mt-2 h-3 w-64" delay={80} />
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-8">
            <section>
              <SkeletonSectionHeader titleWidth="6rem" />
              <div className="flex flex-col gap-2">
                {[0.88, 0.74, 0.92, 0.66, 0.84].map((w, i) => (
                  <TaskRowSkeleton
                    key={i}
                    delay={i * 60}
                    titleWidth={`${Math.round(w * 100)}%`}
                  />
                ))}
              </div>
            </section>

            <section>
              <SkeletonSectionHeader titleWidth="9rem" delay={200} />
              <div className="flex flex-col gap-2">
                {[0.78, 0.62, 0.86].map((w, i) => (
                  <TaskRowSkeleton
                    key={i}
                    delay={300 + i * 60}
                    titleWidth={`${Math.round(w * 100)}%`}
                  />
                ))}
              </div>
            </section>
          </div>

          <SkeletonRightRail />
        </div>
      </div>
    </div>
  );
}
