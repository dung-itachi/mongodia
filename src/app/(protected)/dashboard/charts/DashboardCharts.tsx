/**
 * DashboardCharts Component (Sprint 4.4 — Dashboard Polish)
 *
 * Container component that aggregates all dashboard charts.
 * Uses useDashboardCharts hook (React Query).
 * Memoized to prevent re-renders when other widgets update.
 */

import { memo } from "react";
import {
  CardSection,
  SkeletonCard,
  SkeletonTable,
} from "@/components/common";
import { BarChartOutlined } from "@ant-design/icons";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import DashboardErrorState from "../DashboardErrorState";
import PipelineChart from "./PipelineChart";
import RevenueChart from "./RevenueChart";
import LeadSourceChart from "./LeadSourceChart";
import TopSaleChart from "./TopSaleChart";
import TopMarketingChart from "./TopMarketingChart";
import styles from "../dashboard.module.css";

function DashboardChartsInner() {
  const { data, loading, error, refetch } = useDashboardCharts();

  if (loading) {
    return (
      <div className={styles["d4-section"]}>
        <div className={styles["d4-grid-2"]}>
          <SkeletonCard rows={5} />
          <SkeletonCard rows={5} />
          <SkeletonCard rows={5} />
          <SkeletonCard rows={5} />
        </div>
        <CardSection title="Top Marketing">
          <SkeletonTable rows={5} columns={3} />
        </CardSection>
      </div>
    );
  }

  if (error || !data) {
    return (
      <DashboardErrorState
        cardTitle="Charts"
        icon={<BarChartOutlined />}
        title="Không thể tải biểu đồ"
        message={error || "Đã xảy ra lỗi khi tải dữ liệu"}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div className={styles["d4-section"]} aria-label="Dashboard charts">
      <div className={styles["d4-grid-2"]}>
        <PipelineChart data={data.pipeline} />
        <RevenueChart data={data.revenue} />
        <LeadSourceChart data={data.leadSource} />
        <TopSaleChart data={data.topSale} />
      </div>
      <TopMarketingChart data={data.topMarketing} />
    </div>
  );
}

const DashboardCharts = memo(DashboardChartsInner);
export default DashboardCharts;