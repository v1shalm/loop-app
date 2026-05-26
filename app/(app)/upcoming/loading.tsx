import {
  SkeletonDayColumn,
  SkeletonPageHeader,
} from "@/components/skeletons";

/**
 * Upcoming route skeleton. The real /upcoming view renders seven day
 * columns wrapped in a flex-wrap grid. We mirror that here so the
 * canvas doesn't go from "single column placeholder" to "seven
 * columns of data" — both the placeholder and the real view share
 * the same column geometry, only the cells flip from skeleton to
 * task rows.
 *
 * Row counts per column are deliberately varied (3, 1, 2, 4, 0, 2,
 * 1) so the placeholder reads as a realistic week rather than seven
 * identical columns.
 */
export default function UpcomingLoading() {
  const rowsByColumn = [3, 1, 2, 4, 0, 2, 1];
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="w-full px-8 pb-24 pt-8">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-6">
          {rowsByColumn.map((rows, i) => (
            <SkeletonDayColumn key={i} delay={i * 80} rows={rows} />
          ))}
        </div>
      </div>
    </div>
  );
}
