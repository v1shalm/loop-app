import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loop — A case study by Vishal Maurya",
  description:
    "How I built a team task tracker for the Tist take-home. Two days, full-stack, with notes on every product decision and where AI helped vs. where I had to override it.",
};

export default function ProcessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
