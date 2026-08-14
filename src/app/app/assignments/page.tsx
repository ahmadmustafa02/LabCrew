import type { Metadata } from "next";
import { AssignmentsView } from "@/components/assignments/assignments-view";

export const metadata: Metadata = {
  title: "Assignments",
};

export default function AssignmentsPage() {
  return <AssignmentsView />;
}
