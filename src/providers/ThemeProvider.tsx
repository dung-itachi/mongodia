"use client";

// Import suppression FIRST before any Ant Design imports
import "@/lib/suppress-warnings";

import { ConfigProvider, App } from "antd";
import { ReactNode } from "react";
import ToastContainer from "@/components/common/feedback/Toast";

type Props = {
  children: ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
      componentSize="middle"
      popupMatchSelectWidth={false}
    >
      <App>
        <ToastContainer />
        {children}
      </App>
    </ConfigProvider>
  );
}