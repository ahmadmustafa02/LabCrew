import { AppShell } from "@/components/app/app-shell";
import { RoleGate } from "@/components/app/role-gate";
import { AuthProvider } from "@/components/session/auth-provider";
import { SessionProvider } from "@/components/session/session-provider";
import { requireAppMembership } from "@/server/auth/membership";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAppMembership();

  return (
    <AuthProvider>
      <SessionProvider>
        <AppShell>
          <RoleGate>{children}</RoleGate>
        </AppShell>
      </SessionProvider>
    </AuthProvider>
  );
}
