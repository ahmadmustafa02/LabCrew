import { AppShell } from "@/components/app/app-shell";
import { SessionProvider } from "@/components/session/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
