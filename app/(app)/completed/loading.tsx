import {
  SkeletonPageHeader,
  SkeletonSectionHeader,
  TaskRowSkeleton,
} from "@/components/skeletons";

/**
 * Completed route skeleton. Real /completed renders task groups by
 * the day they were finished (Today, Yesterday, This week, Earlier).
 * Three placeholder day groups land close to the median page state.
 */
export default function CompletedLoading() {
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-10">
        {[
          { title: "6rem", rows: [0.78, 0.64, 0.88] },
          { title: "8rem", rows: [0.7, 0.92] },
          { title: "7rem", rows: [0.6, 0.84, 0.74, 0.66] },
        ].map((group, gi) => (
          <section key={gi} className="mb-8">
            <SkeletonSectionHeader
              titleWidth={group.title}
              delay={gi * 200}
            />
            <div className="flex flex-col gap-2">
              {group.rows.map((w, i) => (
                <TaskRowSkeleton
                  key={i}
                  delay={gi * 200 + i * 60}
                  titleWidth={`${Math.round(w * 100)}%`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
