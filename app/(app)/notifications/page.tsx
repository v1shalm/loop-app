import { Bell } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { NotificationsList } from "@/components/notifications-list";
import { getRecentActivity } from "@/lib/queries";

export const metadata = { title: "Notifications · Loop" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const all = await getRecentActivity();

  const activeTab = tab === "tasks" ? "tasks" : "all";

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Bell size={16} />}
        title="Notifications"
        subtitle={
          all.length === 0
            ? "Nothing new"
            : `${all.length} from the past week`
        }
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        <NotificationsList items={all} activeTab={activeTab} />
      </div>
    </div>
  );
}
