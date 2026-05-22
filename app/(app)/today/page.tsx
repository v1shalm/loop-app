import { redirect } from "next/navigation";

/**
 * /today merged into the "My work" home (/assigned-to-me) — the audit
 * flagged the two as redundant for non-technical TIST users. The Today
 * section now lives inside My work as one of the date-bucketed groups.
 * Redirect kept so existing bookmarks don't break.
 */
export default function TodayPage() {
  redirect("/assigned-to-me");
}
