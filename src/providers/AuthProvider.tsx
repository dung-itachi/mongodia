///Khi website mở - Đọc token từ localStorage và set vào store
"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  useEffect(() => {
    // Token is automatically restored by persist middleware
    // No manual restoration needed
  }, []);

  return <>{children}</>;
}