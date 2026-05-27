import {
  SkeletonDayRow,
  SkeletonPageHeader,
} from "@/components/skeletons";

/**
 * Upcoming route skeleton. The real /upcoming view is a vertical
 * agenda — seven day rows stacked down a centred column. We mirror
 * that here so the canvas doesn't reflow from placeholder to data;
 * only the cells flip from skeleton to task rows.
 *
 * Row counts per day are deliberately varied (1, 0, 2, 0, 1, 0, 3) so
 * the placeholder reads as a realistic week rather than identical rows.
 */
export default function UpcomingLoading() {
  const rowsByDay = [1, 0, 2, 0, 1, 0, 3];
  return (
    <div className="min-h-full">
      <SkeletonPageHeader />
      <div className="w-full px-8 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
          {rowsByDay.map((rows, i) => (
            <SkeletonDayRow key={i} delay={i * 80} rows={rows} />
          ))}
        </div>
      </div>
    </div>
  );
}
