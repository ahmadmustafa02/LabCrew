import { AppShell } from "@/components/app/app-shell";
import { RoleGate } from "@/components/app/role-gate";
import { AuthProvider } from "@/components/session/auth-provider";
import { SessionProvider } from "@/components/session/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
