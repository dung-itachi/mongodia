/**
 * DrawerForm Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Drawer with form footer.
 *
 * Ant Design v5+ deprecates `width` in favor of `size` ("default" | "large").
 * Use `size` prop for standard sizes, or `width` for custom dimensions.
 */

import { Drawer, Button, Space } from "antd";
import { ReactNode } from "react";

export type DrawerFormProps = {
  open: boolean;
  title: string;
  /** Ant Design drawer size: "default" (378px) or "large" (736px) */
  size?: "default" | "large";
  /** Custom width in pixels. Use `size` for standard sizes instead. */
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
  size,
  width,
  loading,
  onClose,
  onSubmit,
  submitText = "Lưu",
  cancelText = "Hủy",
  footer,
  children,
}: DrawerFormProps) {
  // Ant Design v5+ deprecates `width` in favor of `size` or `styles.wrapper.width`
  const drawerStyles = size
    ? undefined
    : { wrapper: { width: width ?? 600 } };

  return (
    <Drawer
      title={title}
      placement="right"
      size={size}
      styles={drawerStyles}
      open={open}
      onClose={onClose}
      destroyOnHidden
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
