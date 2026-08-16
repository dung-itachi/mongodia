import { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";
import ProtectedShell from "@/components/layout/ProtectedShell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>
        <ProtectedShell>{children}</ProtectedShell>
      </AppShell>
    </AuthGuard>
  );
}
