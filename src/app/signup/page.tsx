import { Suspense } from "react";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-lc-bg text-sm text-lc-muted">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
