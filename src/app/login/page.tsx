import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-lc-bg text-sm text-lc-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
