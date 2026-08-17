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
 *
 * Sprint X.Y — Mở rộng bảng với các cột theo thiết kế mongolia-crm (7):
 *   Ngày | Số đẩy | Đã gọi | Chốt | Giao | TC | DS ₮ | DS ₫ | Biểu đồ
 */

import { memo, useMemo, useState } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic, Select, Space, Empty } from "antd";
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
  pushed: number;
  called: number;
  closed: number;
  shipped: number;
  deliveredOk: number;
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

  const { data, loading, error, refetch, scope } = useMarketingDailyReport({
    period,
    marketingEmployeeId: isGlobal ? selectedMarketingEmployeeId : undefined,
  });

  // Chỉ fetch MKT list khi user là GLOBAL — non-GLOBAL bị khoá cứng rồi.
  const { employees: marketingEmployeeOptions } = useMarketingEmployees();

  const tableData: DailyRevenueRow[] = useMemo(() => {
    if (!data) return [];
    return data.data.map((item, index) => {
      const dateParts = item.date.split("-");
      return {
        key: item.date || String(index),
        date: item.date,
        dateDisplay: `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`,
        revenue: item.revenue,
        orders: item.orders,
        avgOrder: item.avgOrder,
        pushed: item.pushed ?? 0,
        called: item.called ?? 0,
        closed: item.closed ?? 0,
        shipped: item.shipped ?? 0,
        deliveredOk: item.deliveredOk ?? 0,
      };
    });
  }, [data]);

  // Max revenue để scale biểu đồ bar — dựa vào tổng doanh thu của cả period
  const maxRevenue = useMemo(
    () => Math.max(...tableData.map((r) => r.revenue), 1),
    [tableData]
  );

  // Total revenue sum để scale chiều cao cột tỷ lệ với tổng period
  const totalRevenueSum = useMemo(
    () => tableData.reduce((s, r) => s + r.revenue, 0),
    [tableData]
  );

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

  const summary = data.summary;

  const columns: ColumnsType<DailyRevenueRow> = [
    {
      title: "Ngày",
      dataIndex: "dateDisplay",
      key: "dateDisplay",
      width: 110,
      fixed: "left",
      align: "left",
      render: (text: string) => (
        <span style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
          {text}
        </span>
      ),
    },
    {
      title: "Số đẩy",
      dataIndex: "pushed",
      key: "pushed",
      width: 90,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#1890ff" }}>{value}</span>
      ),
    },
    {
      title: "Đã gọi",
      dataIndex: "called",
      key: "called",
      width: 90,
      align: "center",
    },
    {
      title: "Chốt",
      dataIndex: "closed",
      key: "closed",
      width: 80,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#52c41a" }}>{value}</span>
      ),
    },
    {
      title: "Giao",
      dataIndex: "shipped",
      key: "shipped",
      width: 80,
      align: "center",
    },
    {
      title: "TC",
      dataIndex: "deliveredOk",
      key: "deliveredOk",
      width: 80,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#13c2c2" }}>{value}</span>
      ),
    },
    {
      title: "DS ₮",
      dataIndex: "revenue",
      key: "revenueMnt",
      width: 130,
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <span style={{ color: "#fa8c16", fontWeight: 700 }}>
            {formatNumber(value)}₮
          </span>
        ) : (
          <span style={{ color: "#bfbfbf" }}>-</span>
        ),
    },
    {
      title: "DS ₫",
      dataIndex: "revenue",
      key: "revenueVnd",
      width: 140,
      align: "right",
      render: (value: number) =>
        value > 0 ? (
          <span style={{ color: "#52c41a", fontWeight: 700 }}>
            {formatNumber(value)}₫
          </span>
        ) : (
          <span style={{ color: "#bfbfbf" }}>-</span>
        ),
    },
    {
      title: "Biểu đồ",
      key: "chart",
      width: 140,
      render: (_, record) => {
        const pct =
          record.revenue > 0 && totalRevenueSum > 0
            ? Math.max((record.revenue / totalRevenueSum) * 100, 4)
            : 0;
        const hasRev = record.revenue > 0;
        return (
          <div className={styles["mk-daily-bar-wrap"]}>
            <div
              className={
                hasRev
                  ? `${styles["mk-daily-bar-fill"]} ${styles["mk-daily-bar-fill--has-rev"]}`
                  : `${styles["mk-daily-bar-fill"]} ${styles["mk-daily-bar-fill--no-rev"]}`
              }
              style={{ width: `${pct}%` }}
              aria-label={`Doanh thu ${formatNumber(record.revenue)}`}
            />
          </div>
        );
      },
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
      title={
        <span>
          📈 Doanh số theo ngày
          <small style={{ marginLeft: 8, color: "#8c8c8c", fontWeight: 400 }}>
            {tableData.length} ngày · {summary.totalPushed} số · {summary.totalClosed} chốt · {summary.totalDeliveredOk} TC
          </small>
        </span>
      }
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
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="Tổng DS"
            value={summary.totalRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#fa8c16", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="Số đẩy"
            value={summary.totalPushed}
            styles={{ content: { color: "#1890ff", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="Đã gọi"
            value={summary.totalCalled}
            styles={{ content: { fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="Chốt"
            value={summary.totalClosed}
            styles={{ content: { color: "#52c41a", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="Giao"
            value={summary.totalShipped}
            styles={{ content: { fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title="TC"
            value={summary.totalDeliveredOk}
            styles={{ content: { color: "#13c2c2", fontSize: "20px" } }}
          />
        </Col>
      </Row>

      {/* Daily Table */}
      {tableData.length === 0 ? (
        <Empty description="Chưa có dữ liệu doanh số" />
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          className={styles["mk-daily-report-table"]}
          bordered
          summary={(rows) => {
            const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
            return (
              <Table.Summary.Row
                style={{ background: "#f8fafd", fontWeight: 700, fontSize: 12 }}
              >
                <Table.Summary.Cell index={0} align="left">
                  Tổng
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <span style={{ color: "#1890ff" }}>{summary.totalPushed}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">
                  {summary.totalCalled}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">
                  <span style={{ color: "#52c41a" }}>{summary.totalClosed}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  {summary.totalShipped}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">
                  <span style={{ color: "#13c2c2" }}>{summary.totalDeliveredOk}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span style={{ color: "#fa8c16" }}>
                    {formatNumber(totalRevenue)}₮
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span style={{ color: "#52c41a" }}>
                    {formatNumber(totalRevenue)}₫
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} />
              </Table.Summary.Row>
            );
          }}
        />
      )}
    </Card>
  );
}

const DailyRevenueReport = memo(DailyRevenueReportInner);
export default DailyRevenueReport;