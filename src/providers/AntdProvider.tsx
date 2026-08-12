"use client";

import { App, ConfigProvider } from "antd";
import { ReactNode, createContext, useContext } from "react";

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
      theme={{
        token: {
          colorPrimary: "#1677ff",
        },
      }}
    >
      <AntAppContext.Provider value={app}>
        <App>{children}</App>
      </AntAppContext.Provider>
    </ConfigProvider>
  );
}
