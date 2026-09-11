import type { Metadata } from "next";
import { LabDeskView } from "@/components/desk/lab-desk-view";

export const metadata: Metadata = { title: "Who has what" };

export default function DeskPage() {
  return <LabDeskView />;
}
