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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type MarketingErrorStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  cardTitle?: string;
};

export default function MarketingErrorState({
  title,
  message,
  icon,
  onRetry,
  cardTitle,
}: MarketingErrorStateProps) {
  const lang = useLanguageStore((s) => s.language);
  const body = (
    <EmptyState
      icon={icon}
      title={title ?? t("Không thể tải dữ liệu", lang)}
      description={message || t("Đã xảy ra lỗi khi tải dữ liệu", lang)}
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