import type { Metadata } from "next";
import { ResearchPlanView } from "@/components/research/research-plan-view";

export const metadata: Metadata = {
  title: "Plan",
};

export default function ResearchPlansPage() {
  return <ResearchPlanView />;
}
