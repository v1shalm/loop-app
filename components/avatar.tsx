"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Round user avatar that renders a Google/uploaded picture when available
 * and falls back to colored initials. Falls back automatically if the image
 * fails to load (404, CORS, signed-out CDN), AND when the URL is a known
 * Google "default-user" placeholder — those URLs return a grey silhouette
 * which clashes with our colored-initial brand.
 */
function isGoogleDefaultAvatar(url: string): boolean {
  // Matches lh3.googleusercontent.com/a/default-user… and similar
  // placeholder patterns Google returns when a user hasn't uploaded a
  // profile picture.
  return (
    url.includes("default-user") ||
    /googleusercontent\.com\/a\/=s\d+-c/.test(url)
  );
}

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
  const showImage =
    !!src && !errored && !isGoogleDefaultAvatar(src);

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
