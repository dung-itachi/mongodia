"use client";

import { createContext, useContext } from "react";
import { App } from "antd";

type MessageType = ReturnType<typeof App.useApp>["message"];

const MessageContext = createContext<MessageType | null>(null);

export function useMessage(): MessageType {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error("useMessage must be used within AppMessageProvider");
  }
  return ctx;
}

export { MessageContext };
