import { cn } from "@/lib/utils";

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
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background px-5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="grid size-[18px] shrink-0 place-items-center text-muted-foreground">
            {icon}
          </span>
        )}
        <h1 className="truncate text-[15.5px] font-semibold leading-none tracking-[-0.005em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <>
            <span
              aria-hidden
              className="h-3.5 w-px shrink-0 bg-border"
            />
            <span className="truncate text-[12.5px] leading-none text-muted-foreground">
              {subtitle}
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">{right}</div>
    </header>
  );
}
