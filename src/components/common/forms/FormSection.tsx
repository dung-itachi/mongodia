/**
 * FormSection Component (Sprint 3.1 - Complete UI Kit)
 *
 * Group form fields under a titled section.
 */

import { Divider } from "antd";
import { ReactNode } from "react";

export type FormSectionProps = {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export default function FormSection({
  title,
  children,
}: FormSectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#262626",
          marginBottom: 16,
        }}
      >
        {title}
      </h3>
      <Divider style={{ margin: "0 0 16px" }} />
      {children}
    </div>
  );
}
