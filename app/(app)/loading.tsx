import {
  SkeletonPageHeader,
  SkeletonSectionHeader,
  TaskRowSkeleton,
} from "@/components/skeletons";

/**
 * Generic (app)-group fallback skeleton. Each major route now has its
 * own loading.tsx that matches its exact layout (inbox, upcoming,
 * assigned-to-me, projects, projects/[id], completed). This fallback
 * handles the smaller routes — team, profile, my-tasks, etc. — with a
 * neutral single-column task list shape.
 */
export default function AppLoading() {
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        <SkeletonSectionHeader titleWidth="7rem" />
        <div className="flex flex-col gap-2">
          {[0.92, 0.78, 0.86, 0.66, 0.9, 0.74, 0.82].map((w, i) => (
            <TaskRowSkeleton
              key={i}
              delay={i * 60}
              titleWidth={`${Math.round(w * 100)}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
