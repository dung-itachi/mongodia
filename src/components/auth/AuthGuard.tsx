"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAuthStore } from "@/store/auth.store";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken) {
      router.replace("/login");
    }
  }, [isHydrated, accessToken, router]);

  if (!isHydrated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
