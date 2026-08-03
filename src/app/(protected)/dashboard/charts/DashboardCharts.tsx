/**
 * DashboardCharts Component (Sprint 4.2 - Dashboard Charts)
 *
 * Container component that aggregates all dashboard charts.
 * Uses useDashboardCharts hook (React Query).
 */

import { CardSection, LoadingOverlay, EmptyState } from "@/components/common";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { BarChartOutlined } from "@ant-design/icons";
import PipelineChart from "./PipelineChart";
import RevenueChart from "./RevenueChart";
import LeadSourceChart from "./LeadSourceChart";
import TopSaleChart from "./TopSaleChart";
import TopMarketingChart from "./TopMarketingChart";

export default function DashboardCharts() {
  const { data, loading, error } = useDashboardCharts();

  if (loading) {
    return (
      <CardSection title="Charts">
        <LoadingOverlay text="Đang tải biểu đồ..." />
      </CardSection>
    );
  }

  if (error || !data) {
    return (
      <CardSection title="Charts">
        <EmptyState
          icon={<BarChartOutlined />}
          title="Không thể tải biểu đồ"
          description={error || "Đã xảy ra lỗi khi tải dữ liệu"}
        />
      </CardSection>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        <PipelineChart data={data.pipeline} />
        <RevenueChart data={data.revenue} />
        <LeadSourceChart data={data.leadSource} />
        <TopSaleChart data={data.topSale} />
      </div>
      <TopMarketingChart data={data.topMarketing} />
    </div>
  );
}