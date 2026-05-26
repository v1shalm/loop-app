"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Avatar } from "@/components/avatar";
import { Bell, ChatCircle, CircleNotch, X } from "@/components/icons";
import { EmptyStateIllustration } from "@/components/empty-state-illustration";
import { MobileSheet } from "@/components/mobile-sheet";
import { RelativeTime } from "@/components/relative-time";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type NotificationItem,
} from "@/components/notifications-context";

/**
 * Desktop inbox drawer. Lives as a third flex column in AppShell so the
 * main canvas naturally re-flows when it opens. On mobile the drawer
 * branch returns null — the bell trigger renders a MobileSheet instead.
 *
 * Open state is owned by NotificationsContext. The drawer is always
 * mounted; closed = width 0 with content clipped, so the slide-in is a
 * CSS transition on outer width.
 */
export function NotificationsDrawer() {
  const { open, setOpen } = useNotifications();
  const isMobile = useIsMobile();

  // Esc closes (desktop only — MobileSheet handles its own dismiss).
  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isMobile, setOpen]);

  if (isMobile) return null;

  return (
    <aside
      aria-label="Notifications"
      inert={!open}
      className={cn(
        "relative hidden h-full shrink-0 overflow-hidden border-l border-border/60 bg-popover/95 backdrop-blur-sm transition-[width] duration-300 ease-[var(--ease-out)] md:block",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      style={{ width: "var(--notif-w, 0px)" }}
    >
      {/* Inner panel is fixed-width so the layout doesn't squash as the
          outer slot animates. The outer overflow-hidden clips. */}
      <div className="absolute right-0 top-0 flex h-full w-[340px] flex-col">
        <NotificationsBody onClose={() => setOpen(false)} />
      </div>
    </aside>
  );
}

/** Shared body used by both desktop drawer and mobile sheet. */
function NotificationsBody({
  onClose,
  variant = "drawer",
}: {
  onClose: () => void;
  variant?: "drawer" | "sheet";
}) {
  const { items, loading, unreadCount, markAllRead, readAt } =
    useNotifications();
  const hasUnread = unreadCount > 0;

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3.5">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Inbox
        </h2>
        {hasUnread && (
          <span className="inline-flex h-[18px] items-center rounded-full bg-primary/15 px-1.5 text-[10.5px] font-semibold tabular-nums text-primary dark:bg-primary/20">
            {unreadCount} new
          </span>
        )}
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasUnread}
          className="focus-ring ml-auto rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Mark all read
        </button>
        {variant === "drawer" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <CircleNotch size={18} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col py-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationRow
                  item={item}
                  readAt={readAt}
                  onClose={onClose}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <EmptyStateIllustration
        tone="blue"
        size={150}
        glyph={<Bell size={18} weight="bold" />}
      />
      <p className="mt-4 text-[14px] font-semibold tracking-tight text-foreground">
        Nothing new
      </p>
      <p className="mt-1 max-w-[220px] text-[12px] text-muted-foreground">
        Assignments and comments on your tasks show up here.
      </p>
    </div>
  );
}

function NotificationRow({
  item,
  readAt,
  onClose,
}: {
  item: NotificationItem;
  readAt: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isNew =
    !!readAt && new Date(item.at).getTime() > new Date(readAt).getTime();

  const href = (() => {
    const base =
      pathname && pathname.length > 1
        ? pathname
        : item.projectId
          ? `/projects/${item.projectId}`
          : "/my-tasks";
    return `${base}?task=${item.taskId}`;
  })();

  const onClick = () => {
    router.push(href, { scroll: false });
    onClose();
  };

  const actor = item.actor;
  const firstName = actor?.name.split(/\s+/)[0] ?? "Someone";

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/40"
    >
      {isNew && (
        <span
          aria-hidden
          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
        />
      )}
      <span className="relative mt-0.5 shrink-0">
        {actor ? (
          <Avatar
            src={actor.avatar_url}
            initials={actor.initials}
            color={actor.avatar_color}
            size={28}
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-muted text-[10.5px] font-semibold text-muted-foreground">
            ?
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 grid size-[14px] place-items-center rounded-full ring-2 ring-popover",
            item.kind === "assigned"
              ? "bg-primary text-primary-foreground"
              : "bg-emerald-600 text-white dark:bg-emerald-500"
          )}
        >
          {item.kind === "assigned" ? (
            <span className="text-[10px] font-bold leading-none">+</span>
          ) : (
            <ChatCircle size={8} weight="fill" />
          )}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-snug text-muted-foreground">
          {item.kind === "assigned" ? (
            <>
              <span className="font-medium text-foreground">{firstName}</span>{" "}
              assigned you{" "}
              <span className="font-medium text-foreground">
                {item.taskTitle}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{firstName}</span>{" "}
              commented on{" "}
              <span className="font-medium text-foreground">
                {item.taskTitle}
              </span>
            </>
          )}
        </p>
        {item.preview && (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground/85">
            {item.preview}
          </p>
        )}
        <RelativeTime
          date={item.at}
          className="mt-1 block text-[11px] text-muted-foreground/70"
        />
      </div>
    </button>
  );
}

/**
 * Bell trigger. Lives in PageHeader so it sits next to the Add task CTA
 * on every route. Click toggles the desktop drawer; on mobile it opens
 * a bottom sheet rendering the same body. The pulsing dot fires only
 * when there are unread items.
 */
export function NotificationsBell({ className }: { className?: string }) {
  const { toggle, setOpen, open, unreadCount } = useNotifications();
  const isMobile = useIsMobile();
  const hasUnread = unreadCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={
          hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        className={cn(
          "focus-ring relative grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]",
          open && "bg-accent/50 text-foreground",
          className
        )}
      >
        <Bell size={16} weight={open ? "fill" : "regular"} />
        {hasUnread && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 grid size-1.5 place-items-center"
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: [0.6, 1.6, 0.6], opacity: [0.9, 0, 0.9] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              className="absolute inline-flex size-1.5 rounded-full bg-rose-400"
            />
            <span className="relative size-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
          </span>
        )}
      </button>

      {isMobile && (
        <MobileSheet
          open={open}
          onClose={() => setOpen(false)}
          ariaLabel="Notifications"
        >
          <div className="flex h-full flex-col">
            <NotificationsBody onClose={() => setOpen(false)} variant="sheet" />
          </div>
        </MobileSheet>
      )}
    </>
  );
}
