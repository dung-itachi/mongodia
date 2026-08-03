/**
 * DashboardWidgets Component (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Container component that aggregates all dashboard widgets.
 * Calls useDashboardActivities and useDashboardQuickActions hooks.
 */

import { CardSection, LoadingOverlay, EmptyState } from "@/components/common";
import {
  NotificationOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useDashboardActivities } from "@/hooks/useDashboardActivities";
import { useDashboardQuickActions } from "@/hooks/useDashboardQuickActions";
import RecentOrders from "./RecentOrders";
import RecentLeads from "./RecentLeads";
import RecentInventory from "./RecentInventory";
import NotificationPanel from "./NotificationPanel";
import QuickActions from "./QuickActions";

export default function DashboardWidgets() {
  const {
    data: activityData,
    loading: activityLoading,
    error: activityError,
  } = useDashboardActivities();
  const { data: quickActions, loading: quickActionsLoading } =
    useDashboardQuickActions();

  if (activityLoading || quickActionsLoading) {
    return (
      <CardSection title="Hoạt động gần đây">
        <LoadingOverlay text="Đang tải hoạt động..." />
      </CardSection>
    );
  }

  if (activityError || !activityData) {
    return (
      <CardSection title="Hoạt động gần đây">
        <EmptyState
          icon={<NotificationOutlined />}
          title="Không thể tải hoạt động"
          description={activityError || "Đã xảy ra lỗi khi tải dữ liệu"}
        />
      </CardSection>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <QuickActions data={quickActions} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        <RecentOrders data={activityData.recentOrders} />
        <RecentLeads data={activityData.recentLeads} />
        <RecentInventory data={activityData.recentInventory} />
        <NotificationPanel data={activityData.notifications} />
      </div>

      <CardSection
        title="Tổng quan"
        actions={
          <ThunderboltOutlined style={{ color: "#1890ff" }} />
        }
      >
        <span style={{ color: "#8c8c8c", fontSize: 13 }}>
          Dashboard đang hiển thị các hoạt động gần nhất. Cập nhật lần cuối vừa xong.
        </span>
      </CardSection>
    </div>
  );
}