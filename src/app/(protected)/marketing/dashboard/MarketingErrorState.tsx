/**
 * MarketingErrorState Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Renders a uniform error state with a Retry action.
 * Uses EmptyState + ActionButton from UI Kit.
 */

import { ReactNode } from "react";
import {
  CardSection,
  EmptyState,
  ActionButton,
} from "@/components/common";
import { ReloadOutlined } from "@ant-design/icons";

export type MarketingErrorStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  cardTitle?: string;
};

export default function MarketingErrorState({
  title = "Không thể tải dữ liệu",
  message,
  icon,
  onRetry,
  cardTitle,
}: MarketingErrorStateProps) {
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