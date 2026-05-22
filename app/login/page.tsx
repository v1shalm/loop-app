import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Loop",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-10">
      <div className="w-full max-w-[440px]">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="surface-brand grid size-9 place-items-center rounded-md text-[15px] font-bold text-white shadow-[var(--shadow-brand-tile)]">
            L
          </span>
          <span className="text-[18px] font-semibold tracking-tight text-foreground">
            Loop
          </span>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft-sm">
          <div className="px-7 pb-6 pt-7">
            <h1 className="text-center text-[20px] font-semibold tracking-tight text-foreground">
              Welcome
            </h1>
            <p className="mt-1 text-center text-[13px] text-muted-foreground">
              Sign in or create an account with your work email.
            </p>

            <div className="mt-6">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>

          <div className="border-t border-border/50 bg-muted/40 px-7 py-3 text-center text-[11.5px] text-muted-foreground">
            By continuing you agree to be a good teammate.
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Trouble signing in?{" "}
          <span className="text-foreground">Ask your workspace admin</span> for
          an invite.
        </p>
      </div>
    </main>
  );
}
