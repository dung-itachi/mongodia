/**
 * ToolbarActions Component (Sprint 3.1 - Complete UI Kit)
 *
 * Actions for table/toolbar.
 */

import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ReactNode } from "react";

export type ToolbarActionsProps = {
  /** Primary action (e.g., Create) */
  onCreate?: () => void;
  createText?: string;
  /** Additional actions */
  extra?: ReactNode;
  /** Loading state */
  loading?: boolean;
};

export default function ToolbarActions({
  onCreate,
  createText = "Tạo mới",
  extra,
  loading,
}: ToolbarActionsProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {extra}
      {onCreate && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
          loading={loading}
        >
          {createText}
        </Button>
      )}
    </div>
  );
}
