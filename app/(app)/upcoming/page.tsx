import { CalendarDots } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InviteCTA } from "@/components/invite-cta";
import { UpcomingSevenDays } from "@/components/upcoming-seven-days";
import { getUpcomingTasksInRange } from "@/lib/queries";

export const metadata = { title: "Upcoming · Loop" };

export default async function UpcomingPage() {
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  const sevenDayEnd = new Date(now);
  sevenDayEnd.setDate(sevenDayEnd.getDate() + 6);
  sevenDayEnd.setHours(23, 59, 59, 999);

  const tasks = await getUpcomingTasksInRange(rangeStart, sevenDayEnd);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<CalendarDots size={16} />}
        title="Upcoming"
        subtitle="Next 7 days"
      />

      <div className="w-full px-8 pb-24 pt-8">
        {tasks.length === 0 ? (
          <div className="mx-auto w-full max-w-[1100px]">
            <EmptyState
              tone="green"
              icon={<CalendarDots size={20} weight="bold" />}
              title="Nothing scheduled"
              hint="Schedule something for later this week or pass work to a teammate."
              actionLabel="Add a task"
              secondarySlot={<InviteCTA />}
              tips={[
                "Tasks with a due date in the next seven days show up here.",
                "Drag a date on a task to move it between days.",
              ]}
            />
          </div>
        ) : (
          <UpcomingSevenDays tasks={tasks} />
        )}
      </div>
    </div>
  );
}
