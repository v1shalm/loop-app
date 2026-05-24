"use client";

import { useEffect } from "react";

/**
 * The case study page renders in light mode regardless of the user's
 * theme preference. Pink-on-light makes the brand chrome read
 * confidently for first-time reviewers, and the dark-mode screenshots
 * embedded below get a stronger contrast lift sitting on a light
 * canvas.
 *
 * On mount we strip the `.dark` class from <html> (if present) and
 * remember whether to restore it. On unmount — i.e. when the user
 * navigates away from /process — the original theme comes back.
 */
export function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    if (!wasDark) return;

    html.classList.remove("dark");
    return () => {
      html.classList.add("dark");
    };
  }, []);

  return null;
}
