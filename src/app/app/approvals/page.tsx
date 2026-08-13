import type { Metadata } from "next";
import { ApprovalsView } from "@/components/approvals/approvals-view";

export const metadata: Metadata = {
  title: "Approvals",
};

export default function ApprovalsPage() {
  return <ApprovalsView />;
}
