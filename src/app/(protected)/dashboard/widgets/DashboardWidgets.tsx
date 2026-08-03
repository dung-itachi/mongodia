/**
 * DashboardWidgets Component (Sprint 4.4 — Dashboard Polish)
 *
 * Container component that aggregates all dashboard widgets.
 * Calls useDashboardActivities and useDashboardQuickActions hooks.
 * Memoized to avoid re-render when charts change.
 */

import { memo } from "react";
import { CardSection, SkeletonCard, SkeletonTable } from "@/components/common";
import {
  NotificationOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useDashboardActivities } from "@/hooks/useDashboardActivities";
import { useDashboardQuickActions } from "@/hooks/useDashboardQuickActions";
import DashboardErrorState from "../DashboardErrorState";
import RecentOrders from "./RecentOrders";
import RecentLeads from "./RecentLeads";
import RecentInventory from "./RecentInventory";
import NotificationPanel from "./NotificationPanel";
import QuickActions from "./QuickActions";
import styles from "../dashboard.module.css";

function DashboardWidgetsInner() {
  const {
    data: activityData,
    loading: activityLoading,
    error: activityError,
    refetch: refetchActivities,
  } = useDashboardActivities();
  const {
    data: quickActions,
    loading: quickActionsLoading,
    refetch: refetchQuickActions,
  } = useDashboardQuickActions();

  const isLoading = activityLoading || quickActionsLoading;

  if (isLoading) {
    return (
      <div className={styles["d4-section"]} aria-busy="true">
        <CardSection title="Thao tác nhanh">
          <SkeletonCard rows={1} title={false} avatar={false} />
        </CardSection>
        <div className={styles["d4-grid-2"]}>
          <SkeletonTable rows={5} columns={4} />
          <SkeletonTable rows={5} columns={4} />
          <SkeletonTable rows={5} columns={4} />
          <SkeletonCard rows={5} />
        </div>
      </div>
    );
  }

  if (activityError || !activityData) {
    return (
      <DashboardErrorState
        cardTitle="Hoạt động gần đây"
        icon={<NotificationOutlined />}
        title="Không thể tải hoạt động"
        message={activityError || "Đã xảy ra lỗi khi tải dữ liệu"}
        onRetry={() => {
          void refetchActivities();
          void refetchQuickActions();
        }}
      />
    );
  }

  return (
    <div
      className={styles["d4-section"]}
      aria-label="Dashboard widgets"
    >
      <QuickActions data={quickActions} />

      <div className={styles["d4-grid-2"]}>
        <RecentOrders data={activityData.recentOrders} />
        <RecentLeads data={activityData.recentLeads} />
        <RecentInventory data={activityData.recentInventory} />
        <NotificationPanel data={activityData.notifications} />
      </div>

      <CardSection
        title="Tổng quan"
        actions={<ThunderboltOutlined aria-label="Tổng quan" />}
      >
        <span
          style={{ color: "#8c8c8c", fontSize: 13 }}
          aria-label="Cập nhật trạng thái"
        >
          Dashboard đang hiển thị các hoạt động gần nhất. Cập nhật lần cuối vừa xong.
        </span>
      </CardSection>
    </div>
  );
}

const DashboardWidgets = memo(DashboardWidgetsInner);
export default DashboardWidgets;