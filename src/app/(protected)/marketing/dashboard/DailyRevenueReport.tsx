"use client";

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
 *
 * Sprint 8.0 — Phân trang khi period > 30 ngày
 *
 * Sprint 8.X — Team/Area filter support:
 *  - Khi lọc theo Team hoặc Area, render NHIỀU BẢNG (mỗi MKT là 1 bảng).
 *  - Khi lọc theo MKT cụ thể, render 1 bảng đơn lẻ.
 */

import { memo, useMemo, useState, useEffect } from "react";
import { Card, Table, Skeleton, Row, Col, Statistic, Select, Space, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";
import {
  useMarketingDailyReport,
  type DailyReportItem,
  type DailyReportSummary,
} from "@/hooks/useMarketingDailyReport";
import { useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";
import { useAuthStore } from "@/store/auth.store";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type DailyRevenueReportProps = {
  period: ChartPeriod;
  teamId?: string;
  areaId?: string;
  /** When true + teamId/areaId provided, render multiple tables (one per MKT). */
  groupByEmployee?: boolean;
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

/**
 * Tính page size dựa vào period
 */
function getPageSize(period: ChartPeriod): number {
  const periodDays: Record<ChartPeriod, number> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "monthStart": 31,
    "1month": 30,
    "30d": 30,
    "90d": 90,
  };
  const days = periodDays[period] ?? 30;
  return days >= 30 ? 15 : 0;
}

function toRows(items: DailyReportItem[]): DailyRevenueRow[] {
  return items.map((item, index) => {
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
}

function defaultSummary(): DailyReportSummary {
  return {
    totalDays: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgDailyRevenue: 0,
    totalAdsSpent: 0,
    totalAdsRevenue: 0,
    totalLeads: 0,
    totalClosedLeads: 0,
    overallROAS: 0,
    totalPushed: 0,
    totalCalled: 0,
    totalClosed: 0,
    totalShipped: 0,
    totalDeliveredOk: 0,
  };
}

// ============================================================================
// Reusable table block
// ============================================================================

type RevenueTableBlockProps = {
  title?: React.ReactNode;
  items: DailyReportItem[];
  summary: DailyReportSummary;
  period: ChartPeriod;
  loading: boolean;
};

function RevenueTableBlock({ title, items, summary, period, loading }: RevenueTableBlockProps) {
  const lang = useLanguageStore((s) => s.language);
  const pageSize = getPageSize(period);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [period]);

  const tableData = useMemo(() => toRows(items), [items]);
  const paginatedData = useMemo(() => {
    if (!pageSize || tableData.length <= pageSize) return tableData;
    const start = (currentPage - 1) * pageSize;
    return tableData.slice(start, start + pageSize);
  }, [tableData, currentPage, pageSize]);

  const totalRevenueSum = useMemo(
    () => tableData.reduce((s, r) => s + r.revenue, 0),
    [tableData]
  );

  const showPagination = pageSize > 0 && tableData.length > pageSize;
  const s = summary ?? defaultSummary();

  if (loading) {
    return (
      <Card title={title || t("📈 Doanh số theo ngày", lang)} className={styles["mk-daily-report-card"]}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const columns: ColumnsType<DailyRevenueRow> = [
    {
      title: t("Ngày", lang),
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
      title: t("Số đẩy", lang),
      dataIndex: "pushed",
      key: "pushed",
      width: 90,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#1890ff" }}>{value}</span>
      ),
    },
    {
      title: t("Đã gọi", lang),
      dataIndex: "called",
      key: "called",
      width: 90,
      align: "center",
    },
    {
      title: t("Chốt", lang),
      dataIndex: "closed",
      key: "closed",
      width: 80,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#52c41a" }}>{value}</span>
      ),
    },
    {
      title: t("Giao", lang),
      dataIndex: "shipped",
      key: "shipped",
      width: 80,
      align: "center",
    },
    {
      title: t("TC", lang),
      dataIndex: "deliveredOk",
      key: "deliveredOk",
      width: 80,
      align: "center",
      render: (value: number) => (
        <span style={{ fontWeight: 700, color: "#13c2c2" }}>{value}</span>
      ),
    },
    {
      title: t("DS ₮", lang),
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
      title: t("DS ₫", lang),
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
      title: t("Biểu đồ", lang),
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
              aria-label={t(`Doanh thu ${formatNumber(record.revenue)}`, lang)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Card
      title={
        title || (
          <span>
            {t("📈 Doanh số theo ngày", lang)}
            <small style={{ marginLeft: 8, color: "#8c8c8c", fontWeight: 400 }}>
              {t(`${tableData.length} ngày`, lang)} · {t(`${s.totalPushed} số`, lang)} · {t(`${s.totalClosed} chốt`, lang)} · {t(`${s.totalDeliveredOk} TC`, lang)}
            </small>
          </span>
        )
      }
      className={styles["mk-daily-report-card"]}
    >
      <Row gutter={16} className={styles["mk-daily-report-summary"]}>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("Tổng DS", lang)}
            value={s.totalRevenue}
            formatter={(value) => formatNumber(Number(value))}
            styles={{ content: { color: "#fa8c16", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("Số đẩy", lang)}
            value={s.totalPushed}
            styles={{ content: { color: "#1890ff", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("Đã gọi", lang)}
            value={s.totalCalled}
            styles={{ content: { fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("Chốt", lang)}
            value={s.totalClosed}
            styles={{ content: { color: "#52c41a", fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("Giao", lang)}
            value={s.totalShipped}
            styles={{ content: { fontSize: "20px" } }}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Statistic
            title={t("TC", lang)}
            value={s.totalDeliveredOk}
            styles={{ content: { color: "#13c2c2", fontSize: "20px" } }}
          />
        </Col>
      </Row>

      {tableData.length === 0 ? (
        <Empty description={t("Chưa có dữ liệu doanh số", lang)} />
      ) : (
        <Table
          columns={columns}
          dataSource={paginatedData}
          pagination={
            showPagination
              ? {
                  current: currentPage,
                  pageSize,
                  total: tableData.length,
                  onChange: (page) => setCurrentPage(page),
                  showSizeChanger: false,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} / ${total} ${t("ngày", lang)}`,
                }
              : false
          }
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
                  {t("Tổng", lang)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <span style={{ color: "#1890ff" }}>{s.totalPushed}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">
                  {s.totalCalled}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">
                  <span style={{ color: "#52c41a" }}>{s.totalClosed}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  {s.totalShipped}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">
                  <span style={{ color: "#13c2c2" }}>{s.totalDeliveredOk}</span>
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

// ============================================================================
// Main component
// ============================================================================

function DailyRevenueReportInner({ period, teamId, areaId, groupByEmployee }: DailyRevenueReportProps) {
  const user = useAuthStore((state) => state.user);
  const isGlobal = isGlobalUser(user);
  const lang = useLanguageStore((s) => s.language);

  // Determine effective filter & groupBy flag
  const effectiveTeamId = teamId && teamId !== "__all__" ? teamId : undefined;
  const effectiveAreaId = areaId && areaId !== "__all__" ? areaId : undefined;
  const useGrouped = !!groupByEmployee && (!!effectiveTeamId || !!effectiveAreaId) && isGlobal;

  const [selectedMarketingEmployeeId, setSelectedMarketingEmployeeId] = useState<
    string | undefined
  >(undefined);

  const { employees: marketingEmployeeOptions } = useMarketingEmployees();

  const { data, loading, error, scope } = useMarketingDailyReport({
    period,
    marketingEmployeeId: isGlobal && !useGrouped ? selectedMarketingEmployeeId : undefined,
    teamId: effectiveTeamId,
    areaId: effectiveAreaId,
    groupBy: useGrouped ? "employee" : null,
  });

  const showingMktName = useGrouped
    ? t(`Đang xem theo ${effectiveAreaId ? "khu vực" : "team"}`, lang)
    : isGlobal
      ? selectedMarketingEmployeeId
        ? marketingEmployeeOptions.find((e) => e.value === selectedMarketingEmployeeId)?.label
        : t("Tất cả MKT", lang)
      : user?.fullName ?? t("MKT của bạn", lang);

  // ─── Render: Multi-table mode (team/area filter) ───
  if (useGrouped) {
    if (loading) {
      return (
        <Card title={t("📈 Doanh số theo ngày", lang)} className={styles["mk-daily-report-card"]}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      );
    }

    if (error) {
      return (
        <Card title={t("📈 Doanh số theo ngày", lang)} className={styles["mk-daily-report-card"]}>
          <div className={styles["mk-drawer-error"]}>
            {t("Không thể tải dữ liệu doanh số theo ngày", lang)}
          </div>
        </Card>
      );
    }

    const grouped = data?.groupedData ?? [];

    return (
      <div className={styles["mk-daily-report-multi"]}>
        <Card
          title={t("📈 Doanh số theo ngày", lang)}
          className={styles["mk-daily-report-card"]}
          extra={
            <span style={{ color: "#595959", fontSize: 13 }}>
              {t("Đang xem:", lang)} <strong>{showingMktName}</strong>
              <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
                {`(${grouped.length} ${t("MKT", lang)})`}
              </span>
            </span>
          }
        >
          {grouped.length === 0 ? (
            <Empty description={t("Chưa có dữ liệu doanh số", lang)} />
          ) : (
            <div className={styles["mk-daily-report-substack"]}>
              {grouped.map((g) => (
                <RevenueTableBlock
                  key={g.marketingEmployeeId}
                  title={
                    <span>
                      <UserOutlined style={{ marginRight: 6 }} />
                      <strong>{g.employeeName}</strong>
                    </span>
                  }
                  items={g.data}
                  summary={g.summary}
                  period={period}
                  loading={false}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ─── Render: Single-table mode (default / MKT cụ thể) ───
  const items = data?.data ?? [];
  const summary = data?.summary ?? defaultSummary();

  if (error && !data) {
    return (
      <Card title={t("📈 Doanh số theo ngày", lang)} className={styles["mk-daily-report-card"]}>
        <div className={styles["mk-drawer-error"]}>
          {t("Không thể tải dữ liệu doanh số theo ngày", lang)}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <span>
          {t("📈 Doanh số theo ngày", lang)}
          <small style={{ marginLeft: 8, color: "#8c8c8c", fontWeight: 400 }}>
            {t(`${items.length} ngày`, lang)} · {t(`${summary.totalPushed} số`, lang)} · {t(`${summary.totalClosed} chốt`, lang)} · {t(`${summary.totalDeliveredOk} TC`, lang)}
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
              placeholder={t("Chọn MKT cụ thể", lang)}
              value={selectedMarketingEmployeeId}
              onChange={(v) => setSelectedMarketingEmployeeId(v)}
              options={[
                { value: "__all__", label: t("Tất cả MKT", lang) },
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
      <div style={{ marginBottom: 12, fontSize: 13, color: "#595959" }}>
        {t("Đang xem:", lang)} <strong>{showingMktName}</strong>
        {scope === "SELF" && (
          <span style={{ marginLeft: 8, color: "#8c8c8c" }}>
            {t("(chỉ đơn hàng của bạn)", lang)}
          </span>
        )}
      </div>

      <RevenueTableBlock
        items={items}
        summary={summary}
        period={period}
        loading={loading}
      />
    </Card>
  );
}

const DailyRevenueReport = memo(DailyRevenueReportInner);
export default DailyRevenueReport;
