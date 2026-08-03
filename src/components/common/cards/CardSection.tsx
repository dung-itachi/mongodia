/**
 * CardSection Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard card wrapper used across the CRM.
 */

import { Card } from "antd";
import { ReactNode } from "react";

export type CardSectionProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  noPadding?: boolean;
};

export default function CardSection({
  title,
  children,
  actions,
  noPadding = false,
}: CardSectionProps) {
  return (
    <Card
      title={title}
      extra={actions}
      styles={{
        body: {
          padding: noPadding ? 0 : 24,
        },
      }}
    >
      {children}
    </Card>
  );
}
