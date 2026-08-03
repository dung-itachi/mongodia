import { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import AuthGuard from "@/components/auth/AuthGuard";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
