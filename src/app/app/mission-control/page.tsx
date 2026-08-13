import type { Metadata } from "next";
import { MissionControlView } from "@/components/mission-control/mission-control-view";

export const metadata: Metadata = {
  title: "Mission Control",
};

export default function MissionControlPage() {
  return <MissionControlView />;
}
