import {
  SkeletonPageHeader,
  SkeletonProjectColumn,
} from "@/components/skeletons";

/**
 * Projects index skeleton. The real /projects view scrolls horizontally
 * with a column per project. Five placeholder columns give the layout
 * shape without pretending to know the user's actual project count.
 */
export default function ProjectsLoading() {
  return (
    <div className="flex min-h-full flex-col">
      <SkeletonPageHeader />
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max items-start gap-4 px-6 pb-10 pt-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonProjectColumn
              key={i}
              delay={i * 100}
              rows={[4, 2, 5, 3, 1][i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
