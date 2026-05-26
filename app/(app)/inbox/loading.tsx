import {
  SkeletonBar,
  SkeletonPageHeader,
  SkeletonRightRail,
  SkeletonSectionHeader,
  TaskRowSkeleton,
} from "@/components/skeletons";

/**
 * Inbox route skeleton. Mirrors the real /inbox layout exactly so the
 * shell renders the moment the route is committed and there's zero
 * content shift when data lands: same max-width, same grid template,
 * same section header position. The wave delay on the rows reads as
 * a list "filling in" rather than every line breathing in unison.
 */
export default function InboxLoading() {
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {/* Filter chip rail above the list — the real Inbox shows
                "All / Mine / Snoozed" pills + a saved-view dropdown. */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SkeletonBar className="h-7 w-16 rounded-full" />
              <SkeletonBar className="h-7 w-20 rounded-full" delay={60} />
              <SkeletonBar className="h-7 w-24 rounded-full" delay={120} />
              <SkeletonBar
                className="ml-auto h-7 w-28 rounded-md"
                delay={180}
              />
            </div>

            <SkeletonSectionHeader titleWidth="10rem" />

            <div className="flex flex-col gap-2">
              {[0.86, 0.92, 0.74, 0.88, 0.66, 0.94, 0.78].map((w, i) => (
                <TaskRowSkeleton
                  key={i}
                  delay={i * 60}
                  titleWidth={`${Math.round(w * 100)}%`}
                />
              ))}
            </div>
          </div>

          <SkeletonRightRail />
        </div>
      </div>
    </div>
  );
}
