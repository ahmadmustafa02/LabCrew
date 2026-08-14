import type { Metadata } from "next";
import { NewAssignmentView } from "@/components/assignments/new-assignment-view";

export const metadata: Metadata = {
  title: "New assignment",
};

export default function NewAssignmentPage() {
  return <NewAssignmentView />;
}
