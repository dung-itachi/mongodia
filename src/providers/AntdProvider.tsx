"use client";

import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { ReactNode, createContext, useContext } from "react";
import { MessageContext } from "@/contexts/MessageContext";

interface AppContextType {
  message: ReturnType<typeof App.useApp>["message"];
  notification: ReturnType<typeof App.useApp>["notification"];
  modal: ReturnType<typeof App.useApp>["modal"];
}

interface Props {
  children: ReactNode;
}

const AntAppContext = createContext<AppContextType | null>(null);

export function useAntApp() {
  const context = useContext(AntAppContext);
  if (!context) {
    throw new Error("useAntApp must be used within AntdProvider");
  }
  return context;
}

export default function AntdProvider({ children }: Props) {
  const app = App.useApp();

  return (
    <ConfigProvider
      // Vietnamese locale: tiêu đề ngày trong DatePicker sẽ là T2..CN (Thứ 2 đến
      // Chủ nhật) vì dayjs locale `vi` có weekStart = 1 (Thứ 2).
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#1677ff",
        },
      }}
    >
      <MessageContext.Provider value={app.message}>
        <AntAppContext.Provider value={app}>
          <App>{children}</App>
        </AntAppContext.Provider>
      </MessageContext.Provider>
    </ConfigProvider>
  );
}
