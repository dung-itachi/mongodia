/**
 * CardActions Component (Sprint 3.1 - Complete UI Kit)
 *
 * Action buttons for cards.
 */

import { Space } from "antd";
import { ReactNode } from "react";

export type CardActionsProps = {
  children: ReactNode;
};

export default function CardActions({ children }: CardActionsProps) {
  return <Space>{children}</Space>;
}
