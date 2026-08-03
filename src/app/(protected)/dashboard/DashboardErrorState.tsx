/**
 * DashboardErrorState Component (Sprint 4.4 — Dashboard Polish)
 *
 * Renders a uniform error state for any dashboard section with a Retry action.
 * Uses EmptyState + ActionButton from UI Kit.
 */

import { CardSection, EmptyState, ActionButton } from "@/components/common";
import { ReloadOutlined } from "@ant-design/icons";
import { ReactNode } from "react";

export type DashboardErrorStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  cardTitle?: string;
};

export default function DashboardErrorState({
  title = "Không thể tải dữ liệu",
  message,
  icon,
  onRetry,
  cardTitle,
}: DashboardErrorStateProps) {
  const body = (
    <EmptyState
      icon={icon}
      title={title}
      description={message || "Đã xảy ra lỗi khi tải dữ liệu"}
      action={
        onRetry ? (
          <ActionButton
            type="primary"
            label="Thử lại"
            icon={<ReloadOutlined />}
            onClick={onRetry}
          />
        ) : undefined
      }
    />
  );

  if (!cardTitle) {
    return body;
  }

  return <CardSection title={cardTitle}>{body}</CardSection>;
}