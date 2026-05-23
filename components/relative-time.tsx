"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * Renders a "n minutes ago" string. SSR and CSR render different output
 * because the server clock and client clock are seconds apart, and that
 * difference flips the formatter's output (e.g. "in 1 minute" vs "2
 * minutes ago"). React used to allow that with a warning; in v19 minified
 * builds it raises error #418.
 *
 * Fix: render a stable string on the server (the value at the moment the
 * page is rendered), tell React to skip hydration text-matching on the
 * <time> element, then re-render on the client after mount with the
 * locally-computed value.
 */
export function RelativeTime({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const target = typeof date === "string" ? new Date(date) : date;
  const initial = formatDistanceToNow(target, { addSuffix: true });
  const [label, setLabel] = useState(initial);

  useEffect(() => {
    setLabel(formatDistanceToNow(target, { addSuffix: true }));
    // Refresh every minute so "1 minute ago" doesn't stay stuck.
    const id = setInterval(
      () => setLabel(formatDistanceToNow(target, { addSuffix: true })),
      60_000
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [+target]);

  return (
    <time
      dateTime={target.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}
