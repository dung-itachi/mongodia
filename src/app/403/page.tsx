"use client";

import { Button } from "antd";
import { useRouter } from "next/navigation";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f5f5f5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "48px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#ff4d4f",
            marginBottom: "16px",
            lineHeight: 1,
          }}
        >
          403
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#262626",
            marginBottom: "8px",
          }}
        >
          Không có quyền truy cập
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#8c8c8c",
            marginBottom: "24px",
          }}
        >
          Bạn không có quyền truy cập trang này.
          <br />
          Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </p>
        <Button
          type="primary"
          size="large"
          onClick={() => router.push("/dashboard")}
          style={{
            minWidth: "160px",
            height: "40px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Quay về Dashboard
        </Button>
      </div>
    </div>
  );
}
