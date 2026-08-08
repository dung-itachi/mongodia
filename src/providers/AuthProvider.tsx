///Khi website mở - Đọc token từ localStorage và set vào store
"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { installFetchAuthInterceptor } from "@/lib/fetchInterceptor";

// Install as early as possible — module evaluation happens when this
// file is first imported (which is from the root client tree). This
// runs BEFORE the user navigates and BEFORE any hook's `useEffect`
// fires. Safe because `installFetchAuthInterceptor` checks for
// `window` and short-circuits on the server.
installFetchAuthInterceptor();

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  useEffect(() => {
    // Re-install on mount to be safe under React 18 StrictMode (which
    // double-invokes effects in dev). The function is idempotent.
    installFetchAuthInterceptor();

    // Token is automatically restored by persist middleware
    // No manual restoration needed
  }, []);

  return <>{children}</>;
}