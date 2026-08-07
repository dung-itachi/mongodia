/**
 * Daily Revenue Report Component
 * 
 * 📈 Doanh số theo ngày
 * Hiển thị doanh thu từ Order collection theo từng ngày
 */

import { memo } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMarketingDailyReport } from "@/hooks/useMarketingDailyReport";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type DailyRevenueReportProps = {
  period: ChartPeriod;
};

type DailyRevenueRow = {
  key: string;
  date: string;
  dateDisplay: string;
  revenue: number;
  orders: number;
  avgOrder: number;
};

function DailyRevenueReportInner({ period }: DailyRevenueReportProps) {
  const { data, loading, error } = useMarketingDailyReport(period);

  if (loading) {
    return (
      <Card 
        title="📈 Doanh số theo ngày" 
        className={styles["mk-daily-report-card"]}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card 
        title="📈 Doanh số theo ngày" 
        className={styles["mk-daily-report-card"]}
      >
        <div className={styles["mk-drawer-error"]}>
          Không thể tải dữ liệu doanh số theo ngày
        </div>
      </Card>
    );
  }

  const tableData: DailyRevenueRow[] = data.data.map((item, index) => {
    const dateParts = item.date.split("-");
    return {
      key: item.date || String(index),
      date: item.date,
      dateDisplay: `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`,
      revenue: item.revenue,
      orders: item.orders,
      avgOrder: item.avgOrder,
    };
  });

  const columns: ColumnsType<DailyRevenueRow> = [
    {
      title: "Ngày",
      dataIndex: "dateDisplay",
      key: "dateDisplay",
      width: 120,
      fixed: "left",
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      width: 180,
      align: "right",
      render: (value: number) => (
        <span style={{ color: "#13c2c2", fontWeight: 600, fontSize: "14px" }}>
          {formatNumber(value)}
        </span>
      ),
    },
    {
      title: "Số đơn hàng",
      dataIndex: "orders",
      key: "orders",
      width: 140,
      align: "center",
    },
    {
      title: "Giá trị TB/đơn",
      dataIndex: "avgOrder",
      key: "avgOrder",
      width: 160,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
  ];

  return (
    <Card 
      title="📈 Doanh số theo ngày" 
      className={styles["mk-daily-report-card"]}
    >
      {/* Summary Stats */}
      <Row gutter={16} className={styles["mk-daily-report-summary"]}>
        <Col span={8}>
          <Statistic 
            title="Tổng doanh thu" 
            value={data.summary.totalRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#13c2c2", fontSize: "22px" } }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Số đơn hàng" 
            value={data.summary.totalOrders}
            styles={{ content: { fontSize: "22px" } }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title="TB doanh thu/ngày" 
            value={data.summary.avgDailyRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { fontSize: "22px" } }}
          />
        </Col>
      </Row>

      {/* Daily Table */}
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        scroll={{ x: 500 }}
        className={styles["mk-daily-report-table"]}
        bordered
      />
    </Card>
  );
}

const DailyRevenueReport = memo(DailyRevenueReportInner);
export default DailyRevenueReport;
