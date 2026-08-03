/**
 * DashboardRefreshButton Component (Sprint 4.4 — Dashboard Polish)
 *
 * Refresh button that invalidates all dashboard React Query keys.
 * Uses ActionButton from UI Kit. No page reload.
 */

import { ActionButton } from "@/components/common";
import { ReloadOutlined } from "@ant-design/icons";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";

export type DashboardRefreshButtonProps = {
  label?: string;
};

export default function DashboardRefreshButton({
  label = "Refresh Dashboard",
}: DashboardRefreshButtonProps) {
  const { refresh, isFetching } = useDashboardRefresh();

  return (
    <ActionButton
      type="secondary"
      icon={<ReloadOutlined spin={isFetching} />}
      label={isFetching ? "Đang tải..." : label}
      loading={isFetching}
      onClick={refresh}
    />
  );
}