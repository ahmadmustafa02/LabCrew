import { Suspense } from "react";
import JoinForm from "./join-form";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-lc-bg text-sm text-lc-muted">
          Loading…
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
