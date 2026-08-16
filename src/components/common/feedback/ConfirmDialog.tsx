/**
 * ConfirmDialog Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard confirmation dialogs.
 */

import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /**
   * Body content. Accepts a plain string (legacy callers) or any
   * ReactNode — Phase 9 extends this so the role-permission save
   * dialog can show a structured diff.
   */
  content: ReactNode;
  type?: "delete" | "warning" | "confirm";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  content,
  type = "confirm",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case "delete":
        return (
          <span style={{ color: "#ff4d4f", fontSize: 24 }}>
            ⚠️
          </span>
        );
      case "warning":
        return (
          <ExclamationCircleOutlined
            style={{ color: "#fa8c16", fontSize: 24 }}
          />
        );
      default:
        return (
          <ExclamationCircleOutlined
            style={{ color: "#1890ff", fontSize: 24 }}
          />
        );
    }
  };

  const getOkButtonDanger = () => {
    return type === "delete";
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {getIcon()}
          {title}
        </div>
      }
      okText={confirmText}
      cancelText={cancelText}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okButtonProps={{ danger: getOkButtonDanger() }}
    >
      <div style={{ margin: "16px 0", color: "#595959" }}>{content}</div>
    </Modal>
  );
}
