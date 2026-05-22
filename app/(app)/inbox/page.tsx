import { Tray } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { InboxList } from "@/components/inbox-list";
import { getInboxAssignments } from "@/lib/queries";

export const metadata = { title: "Inbox · Loop" };

export default async function InboxPage() {
  const tasks = await getInboxAssignments();

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Tray size={16} />}
        title="Inbox"
        subtitle={
          tasks.length === 0
            ? "Nothing waiting"
            : `${tasks.length} new ${tasks.length === 1 ? "assignment" : "assignments"}`
        }
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        {tasks.length === 0 ? (
          <div className="grid place-items-center pt-16 text-center text-muted-foreground">
            <div className="text-3xl">📬</div>
            <p className="mt-3 text-[14px] text-foreground">All caught up</p>
            <p className="mt-1 text-[12.5px]">
              New assignments from teammates land here first.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                New assignments
              </h2>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
            </header>
            <InboxList tasks={tasks} />
          </>
        )}
      </div>
    </div>
  );
}
