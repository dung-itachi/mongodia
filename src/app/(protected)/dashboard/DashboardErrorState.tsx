/**
 * DashboardErrorState Component (Sprint 4.4 — Dashboard Polish)
 *
 * Renders a uniform error state for any dashboard section with a Retry action.
 * Uses EmptyState + ActionButton from UI Kit.
 */

import { CardSection, EmptyState, ActionButton } from "@/components/common";
import { ReloadOutlined } from "@ant-design/icons";
import { ReactNode } from "react";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type DashboardErrorStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  cardTitle?: string;
};

export default function DashboardErrorState({
  title,
  message,
  icon,
  onRetry,
  cardTitle,
}: DashboardErrorStateProps) {
  const lang = useLanguageStore((s) => s.language);
  const resolvedTitle = title ?? t("Không thể tải dữ liệu", lang);
  const resolvedMessage = message ?? t("Đã xảy ra lỗi khi tải dữ liệu", lang);

  const body = (
    <EmptyState
      icon={icon}
      title={resolvedTitle}
      description={resolvedMessage}
      action={
        onRetry ? (
          <ActionButton
            type="primary"
            label={t("Thử lại", lang)}
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