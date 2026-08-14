import { Suspense } from "react";
import { MessagesView } from "@/components/messages/messages-view";

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-lc-muted">Opening messages…</p>}>
      <MessagesView />
    </Suspense>
  );
}
