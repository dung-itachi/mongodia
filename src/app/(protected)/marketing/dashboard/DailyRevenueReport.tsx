/**
 * Daily Revenue Report Component
 *
 * 📈 Doanh số theo ngày
 *
 * Hiển thị doanh thu từ Order collection theo từng ngày.
 *
 * Sprint 7.4 — Scope theo tài khoản đăng nhập:
 *  - MKT (non-GLOBAL): API tự khoá cứng theo `marketingEmployeeId = currentUser._id`.
 *  - ADMIN/GLOBAL: mặc định xem tất cả MKT, có dropdown chọn MKT cụ thể.
 *  - User ADMIN không chọn = xem tất cả; chọn 1 MKT = lọc riêng MKT đó.
 */

import { memo, useState } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic, Select, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";
import { useMarketingDailyReport } from "@/hooks/useMarketingDailyReport";
import { useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";
import { useAuthStore } from "@/store/auth.store";
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

/**
 * ADMIN (role=ADMIN) hoặc user có wildcard permission "*" được xem tất cả MKT.
 */
function isGlobalUser(user: { role: string; permissions: string[] } | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.permissions.includes("*");
}

function DailyRevenueReportInner({ period }: DailyRevenueReportProps) {
  const user = useAuthStore((state) => state.user);
  const isGlobal = isGlobalUser(user);

  const [selectedMarketingEmployeeId, setSelectedMarketingEmployeeId] = useState<
    string | undefined
  >(undefined);

  const { data, loading, error, scope } = useMarketingDailyReport({
    period,
    marketingEmployeeId: isGlobal ? selectedMarketingEmployeeId : undefined,
  });

  // Chỉ fetch MKT list khi user là GLOBAL — non-GLOBAL bị khoá cứng rồi.
  const { employees: marketingEmployeeOptions } = useMarketingEmployees();

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

  const showingMktName = isGlobal
    ? selectedMarketingEmployeeId
      ? marketingEmployeeOptions.find(
          (e) => e.value === selectedMarketingEmployeeId
        )?.label
      : "Tất cả MKT"
    : user?.fullName ?? "MKT của bạn";

  return (
    <Card
      title="📈 Doanh số theo ngày"
      className={styles["mk-daily-report-card"]}
      extra={
        isGlobal ? (
          <Space size={8}>
            <UserOutlined style={{ color: "#8c8c8c" }} />
            <Select
              allowClear
              placeholder="Chọn MKT cụ thể"
              value={selectedMarketingEmployeeId}
              onChange={(v) => setSelectedMarketingEmployeeId(v)}
              options={[
                { value: "__all__", label: "Tất cả MKT" },
                ...marketingEmployeeOptions,
              ]}
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 220 }}
            />
          </Space>
        ) : undefined
      }
    >
      {/* Sub-header showing scope */}
      <div
        style={{
          marginBottom: 12,
          fontSize: 13,
          color: "#595959",
        }}
      >
        Đang xem: <strong>{showingMktName}</strong>
        {scope === "SELF" && (
          <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
            (chỉ đơn hàng của bạn)
          </span>
        )}
      </div>

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