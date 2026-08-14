import { LandingPage } from "@/components/marketing/landing-page";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function HomePage() {
  return (
    <MarketingShell>
      <LandingPage />
    </MarketingShell>
  );
}
