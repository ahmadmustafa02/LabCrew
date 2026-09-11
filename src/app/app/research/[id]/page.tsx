import type { Metadata } from "next";
import { ResearchPlanDetail } from "@/components/research/research-plan-detail";

export const metadata: Metadata = { title: "Find sources" };

export default async function ResearchPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResearchPlanDetail planId={id} />;
}
