/**
 * DashboardRefreshButton Component (Sprint 4.4 — Dashboard Polish)
 *
 * Refresh button that invalidates all dashboard React Query keys.
 * Uses ActionButton from UI Kit. No page reload.
 */

import { ActionButton } from "@/components/common";
import { ReloadOutlined } from "@ant-design/icons";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type DashboardRefreshButtonProps = {
  label?: string;
};

export default function DashboardRefreshButton({
  label,
}: DashboardRefreshButtonProps) {
  const lang = useLanguageStore((s) => s.language);
  const { refresh, isFetching } = useDashboardRefresh();
  const resolvedLabel = label ?? t("Refresh Dashboard", lang);

  return (
    <ActionButton
      type="secondary"
      icon={<ReloadOutlined spin={isFetching} />}
      label={isFetching ? t("Đang tải...", lang) : resolvedLabel}
      loading={isFetching}
      onClick={refresh}
    />
  );
}