/**
 * MarketingCharts Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Container component that aggregates marketing charts and top performers.
 * Memoized to avoid re-render when stats change.
 */

import { memo } from "react";
import { CardSection, SkeletonCard, SkeletonTable } from "@/components/common";
import { BarChartOutlined } from "@ant-design/icons";
import { useMarketingDashboard } from "@/hooks/useMarketingDashboard";
import MarketingErrorState from "./MarketingErrorState";
import DailyLeadChart from "./charts/DailyLeadChart";
import LeadSourceChart from "./charts/LeadSourceChart";
import TopMarketingTable from "./TopMarketingTable";
import styles from "./marketing.module.css";

function MarketingChartsInner() {
  const { data, loading, error, refetch } = useMarketingDashboard();

  if (loading) {
    return (
      <div className={styles["mk-section"]} aria-busy="true">
        <div className={styles["mk-grid-2"]}>
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
      <MarketingErrorState
        cardTitle="Biểu đồ"
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
    <div className={styles["mk-section"]} aria-label="Biểu đồ marketing">
      <div className={styles["mk-grid-2"]}>
        <DailyLeadChart data={data.chart.dailyLead} />
        <LeadSourceChart data={data.chart.source} />
      </div>
      <TopMarketingTable data={data.topMarketing} />
    </div>
  );
}

const MarketingCharts = memo(MarketingChartsInner);
export default MarketingCharts;