/**
 * DrawerForm Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Drawer with form footer.
 */

import { Drawer, Button, Space } from "antd";
import { ReactNode } from "react";

export type DrawerFormProps = {
  open: boolean;
  title: string;
  width?: number | string;
  loading?: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export default function DrawerForm({
  open,
  title,
  width = 600,
  loading,
  onClose,
  onSubmit,
  submitText = "Lưu",
  cancelText = "Hủy",
  footer,
  children,
}: DrawerFormProps) {
  return (
    <Drawer
      title={title}
      placement="right"
      width={width}
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        footer !== undefined ? (
          footer
        ) : (
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>{cancelText}</Button>
            {onSubmit && (
              <Button
                type="primary"
                onClick={onSubmit}
                loading={loading}
              >
                {loading ? "Đang lưu..." : submitText}
              </Button>
            )}
          </Space>
        )
      }
    >
      {children}
    </Drawer>
  );
}
