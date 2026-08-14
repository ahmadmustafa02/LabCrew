import type { Metadata } from "next";
import { AssignmentDetailView } from "@/components/assignments/assignment-detail-view";

export const metadata: Metadata = {
  title: "Assignment",
};

type Props = { params: Promise<{ id: string }> };

export default async function AssignmentDetailPage({ params }: Props) {
  const { id } = await params;
  return <AssignmentDetailView assignmentId={id} />;
}
