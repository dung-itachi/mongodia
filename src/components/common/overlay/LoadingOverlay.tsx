/**
 * LoadingOverlay Component (Sprint 3.1 - Complete UI Kit)
 */

import { Spin } from "antd";
import { ReactNode } from "react";

export type LoadingOverlayProps = {
  text?: string;
  fullScreen?: boolean;
  children?: ReactNode;
};

export default function LoadingOverlay({
  text = "Đang tải...",
  fullScreen = false,
  children,
}: LoadingOverlayProps) {
  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          zIndex: 9999,
        }}
      >
        <Spin tip={text} size="large" />
      </div>
    );
  }

  if (children) {
    return (
      <div style={{ position: "relative" }}>
        {children}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          }}
        >
          <Spin tip={text} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <Spin tip={text} size="large" />
    </div>
  );
}
