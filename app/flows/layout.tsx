export default function FlowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Standalone, full-canvas surface (no app sidebar). Inherits the root
  // layout's theme tokens + Inter, so the page reads in light and dark.
  return <div className="min-h-dvh bg-background">{children}</div>;
}
