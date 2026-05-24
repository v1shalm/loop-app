import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Loop",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-10">
      <div className="w-full max-w-[400px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft-sm">
          <div className="px-7 pb-7 pt-8">
            <p className="text-center text-[14px] font-semibold tracking-tight text-foreground">
              Loop
            </p>
            <h1 className="mt-6 text-center text-[22px] font-semibold tracking-[-0.01em] text-foreground">
              Sign in
            </h1>

            <div className="mt-7">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
