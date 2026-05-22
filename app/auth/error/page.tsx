import Link from "next/link";

export const metadata = { title: "Sign-in error · Loop" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const detail = reason
    ? decodeURIComponent(reason).replace(/_/g, " ")
    : "That magic link didn't work.";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="surface-brand grid size-9 place-items-center rounded-md text-[15px] font-bold text-white shadow-[var(--shadow-brand-tile)]">
            L
          </span>
          <span className="text-[18px] font-semibold tracking-tight text-foreground">
            Loop
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft-sm">
          <div className="px-7 py-7 text-center">
            <div className="text-3xl">🤔</div>
            <h1 className="mt-3 text-[18px] font-semibold tracking-tight text-foreground">
              Couldn&apos;t sign you in
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{detail}</p>
            <Link
              href="/login"
              className="focus-ring surface-brand surface-brand-hover mt-5 inline-flex h-10 items-center justify-center rounded-md px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985]"
            >
              Try again
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
