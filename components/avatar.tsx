"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Round user avatar that renders a Google/uploaded picture when available
 * and falls back to colored initials. Falls back automatically if the image
 * fails to load (404, CORS, signed-out CDN).
 */
export function Avatar({
  src,
  initials,
  color,
  size = 28,
  className,
  fontSize,
}: {
  src?: string | null;
  initials: string;
  color: string;
  size?: number;
  className?: string;
  fontSize?: number;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full text-zinc-900 font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: "var(--shadow-avatar)",
        fontSize: fontSize ?? Math.max(9, Math.round(size * 0.36)),
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={initials}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
