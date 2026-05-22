"use client";

import { SidebarSimple } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-context";

export function PageHeader({
  icon,
  title,
  subtitle,
  right,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const { toggle } = useSidebar();

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background px-5",
        className
      )}
    >
      <button
        onClick={toggle}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.94]"
      >
        <SidebarSimple size={16} />
      </button>

      <div className="h-5 w-px bg-border" aria-hidden />

      <div className="flex min-w-0 items-baseline gap-2.5">
        {icon && (
          <span className="grid size-5 shrink-0 translate-y-px place-items-center text-muted-foreground">
            {icon}
          </span>
        )}
        <h1 className="truncate text-[16px] font-semibold tracking-[-0.005em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <span className="truncate text-[12.5px] font-normal text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">{right}</div>
    </header>
  );
}
