/**
 * Buttons Components Index (Sprint 3.1 - Complete UI Kit)
 */

import { Button } from "antd";
import { ReactNode } from "react";

export type ActionButtonProps = {
  type?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  htmlType?: "button" | "submit" | "reset";
  size?: "small" | "middle" | "large";
};

export default function ActionButton({
  type = "primary",
  icon,
  label,
  loading,
  disabled,
  onClick,
  htmlType,
  size = "middle",
}: ActionButtonProps) {
  const buttonTypeMap: Record<string, "primary" | "default" | "text" | "link"> = {
    primary: "primary",
    secondary: "default",
    danger: "primary",
    ghost: "default",
  };

  const isDanger = type === "danger";

  return (
    <Button
      type={buttonTypeMap[type]}
      danger={isDanger}
      icon={icon}
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      htmlType={htmlType}
      size={size}
    >
      {label}
    </Button>
  );
}
