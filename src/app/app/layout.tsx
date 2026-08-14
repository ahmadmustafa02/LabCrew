import { AppShell } from "@/components/app/app-shell";
import { RoleGate } from "@/components/app/role-gate";
import { SessionProvider } from "@/components/session/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>
        <RoleGate>{children}</RoleGate>
      </AppShell>
    </SessionProvider>
  );
}
