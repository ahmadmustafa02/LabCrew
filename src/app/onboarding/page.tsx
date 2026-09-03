import { AuthProvider } from "@/components/session/auth-provider";
import { requireOnboardingAccess } from "@/server/auth/membership";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { session } = await requireOnboardingAccess();
  const email = session.user?.email ?? "your account";

  return (
    <AuthProvider>
      <OnboardingForm email={email} />
    </AuthProvider>
  );
}
