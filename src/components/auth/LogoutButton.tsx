"use client";

import { Button } from "antd";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <Button type="text" onClick={handleLogout}>
      Đăng xuất
    </Button>
  );
}
