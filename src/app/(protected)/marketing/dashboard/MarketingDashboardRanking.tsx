/**
 * MarketingDashboardRanking Component (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven ranking/table rendering.
 */

import { memo } from "react";
import { Card, Skeleton } from "antd";
import { DataTable } from "@/components/common";
import { useMarketingRankingData } from "@/hooks/useMarketingRankingData";
import { MARKETING_DASHBOARD_RANKINGS } from "./marketing-dashboard-ranking.config";
import type { Column } from "@/components/common/table/DataTable";
import styles from "./marketing.module.css";

export type MarketingDashboardRankingProps = {
  onRowClick?: (rankingId: string, rankingType: string, label: string) => void;
};

function MarketingDashboardRankingInner({ onRowClick }: MarketingDashboardRankingProps) {
  const { data, loading, error } = useMarketingRankingData();

  if (loading) {
    return (
      <div className={styles["mk-ranking-grid"]}>
        {MARKETING_DASHBOARD_RANKINGS.map((ranking) => (
          <Card key={ranking.id} title={ranking.title}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles["mk-ranking-grid"]}>
        <Card title="Lỗi">Không thể tải dữ liệu xếp hạng</Card>
      </div>
    );
  }

  return (
    <div className={styles["mk-ranking-grid"]}>
      {MARKETING_DASHBOARD_RANKINGS.map((ranking) => {
        const tableData = ranking.selector(data);
        return (
          <Card key={ranking.id} title={ranking.title} className={styles["mk-ranking-card"]}>
            <DataTable
              columns={ranking.columns as Column[]}
              data={tableData as Record<string, unknown>[]}
              pagination={false}
              rowKey={ranking.type === "facebookPages" ? "pageId" : ranking.type === "marketingEmployees" ? "employeeId" : "campaignId"}
              size="small"
              scroll={{ x: "max-content" }}
              onRow={
                onRowClick
                  ? () => ({
                      onClick: () => onRowClick(ranking.id, ranking.type, ranking.title),
                      style: { cursor: "pointer" },
                    })
                  : undefined
              }
            />
          </Card>
        );
      })}
    </div>
  );
}

const MarketingDashboardRanking = memo(MarketingDashboardRankingInner);
export default MarketingDashboardRanking;
