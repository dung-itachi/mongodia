///Khi website mở - Đọc token từ localStorage và set vào store
"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setToken(token);
    }
  }, [setToken]);

  return <>{children}</>;
}