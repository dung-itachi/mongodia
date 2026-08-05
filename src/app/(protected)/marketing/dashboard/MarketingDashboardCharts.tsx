/**
 * MarketingDashboardCharts Component (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven charts rendering using simple CSS bars.
 * Future: integrate recharts or other charting library.
 */

import { memo } from "react";
import { Card, Skeleton } from "antd";
import { useMarketingChartData } from "@/hooks/useMarketingChartData";
import { MARKETING_DASHBOARD_CHARTS } from "./marketing-dashboard-chart.config";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type MarketingDashboardChartsProps = {
  period: ChartPeriod;
  onChartClick?: (chartId: string, label: string) => void;
};

function MarketingDashboardChartsInner({ period, onChartClick }: MarketingDashboardChartsProps) {
  const { data, loading, error } = useMarketingChartData(period);

  if (loading) {
    return (
      <div className={styles["mk-charts-grid"]}>
        {MARKETING_DASHBOARD_CHARTS.slice(0, 2).map((chart) => (
          <Card key={chart.id} title={chart.title}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles["mk-charts-grid"]}>
        <Card title="Lỗi">Không thể tải dữ liệu biểu đồ</Card>
      </div>
    );
  }

  const formatValue = (value: number, format?: "currency" | "percent" | "number") => {
    switch (format) {
      case "currency":
        return formatNumber(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      default:
        return formatNumber(value);
    }
  };

  return (
    <div className={styles["mk-charts-grid"]}>
      {MARKETING_DASHBOARD_CHARTS.map((chart) => {
        const chartData = chart.selector(data);
        const maxValue = Math.max(...chartData.map((d) => Math.abs(d.value)), 1);

        return (
          <Card
            key={chart.id}
            title={chart.title}
            className={styles["mk-chart-card"]}
            onClick={() => onChartClick?.(chart.id, chart.title)}
            style={{ cursor: onChartClick ? "pointer" : "default" }}
          >
            <div className={styles["mk-chart"]}>
              {chartData.slice(-7).map((point, index) => {
                const heightPercent = Math.max((Math.abs(point.value) / maxValue) * 100, 2);
                const dateParts = point.date.split("-");
                const label = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : point.date;

                return (
                  <div key={point.date || index} className={styles["mk-chart-col"]}>
                    <div className={styles["mk-chart-value"]}>
                      {formatValue(point.value, chart.yAxisFormat)}
                    </div>
                    <div className={styles["mk-chart-bar-container"]}>
                      <div
                        className={styles["mk-chart-bar"]}
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: chart.color,
                        }}
                      />
                    </div>
                    <div className={styles["mk-chart-label"]}>{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const MarketingDashboardCharts = memo(MarketingDashboardChartsInner);
export default MarketingDashboardCharts;
