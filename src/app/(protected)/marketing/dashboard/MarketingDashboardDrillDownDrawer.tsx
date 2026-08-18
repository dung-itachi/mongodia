/**
 * MarketingDashboardDrillDownDrawer Component (Sprint 7.3 — Drill-down & Export)
 *
 * Drawer hiển thị chi tiết khi click vào Card, Chart, hoặc Ranking.
 * Hiển thị: Lead list, Expense, Revenue theo filter context.
 */

import { memo, useState } from "react";
import { Drawer, Tabs, Table, Statistic, Row, Col, Spin, Card } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DrillDownData } from "@/types/marketing-dashboard";
import type { DrillDownContext } from "@/types/marketing-dashboard-filter";
import { useMarketingDashboardDrillDown } from "@/hooks/useMarketingDashboardDrillDown";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type MarketingDashboardDrillDownDrawerProps = {
  open: boolean;
  context: DrillDownContext | null;
  onClose: () => void;
};

function getCardTabPriority(cardKey?: string): string[] {
  if (!cardKey) return ["leads", "expenses", "revenues"];
  const orderCards = ["totalPushed", "called", "notCalled", "closingRate", "orderRevenue", "deliveredOk"];
  const leadCards = ["todayLead", "monthLead", "assignedLead", "closedLead", "conversionRate"];
  const expenseCards = ["totalSpent", "roas"];
  const revenueCards = ["monthRevenue"];

  if (orderCards.includes(cardKey)) return ["leads", "expenses", "revenues"];
  if (leadCards.includes(cardKey)) return ["leads"];
  if (expenseCards.includes(cardKey)) return ["expenses"];
  if (revenueCards.includes(cardKey)) return ["revenues"];
  return ["leads", "expenses", "revenues"];
}

function MarketingDashboardDrillDownDrawerInner({
  open,
  context,
  onClose,
}: MarketingDashboardDrillDownDrawerProps) {
  const [activeTab, setActiveTab] = useState("leads");
  const { data, loading, error } = useMarketingDashboardDrillDown(
    context ? context.filter : null,
    context?.type === "card" ? context.cardKey : undefined
  );

  // Reset active tab when context changes
  const cardKey = context?.type === "card" ? context.cardKey : undefined;
  const tabPriority = getCardTabPriority(cardKey);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const title = context
    ? `Chi tiết: ${context.label}`
    : "Chi tiết Dashboard";

  return (
    <Drawer
      title={title}
      placement="right"
      styles={{ wrapper: { width: 800 } }}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {loading && (
        <div className={styles["mk-drawer-loading"]}>
          <Spin size="large" />
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {error && (
        <div className={styles["mk-drawer-error"]}>
          <p>Không thể tải dữ liệu: {error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div className={styles["mk-drawer-summary"]}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Tổng Lead"
                  value={data.summary.totalLeads}
                  formatter={(val) => formatNumber(Number(val))}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Chi phí"
                  value={data.summary.totalExpense}
                  formatter={(val) => formatNumber(Number(val))}
                  suffix="₫"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Doanh thu"
                  value={data.summary.totalRevenue}
                  formatter={(val) => formatNumber(Number(val))}
                  suffix="₫"
                />
              </Col>
              <Col span={3}>
                <Statistic
                  title="ROAS"
                  value={data.summary.roas}
                  precision={2}
                  suffix="x"
                />
              </Col>
              <Col span={3}>
                <Statistic
                  title="CPA"
                  value={data.summary.cpa}
                  formatter={(val) => formatNumber(Number(val))}
                  suffix="₫"
                />
              </Col>
            </Row>
          </div>

          {/* Tabs for Leads, Expenses, Revenues */}
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={
              tabPriority.map((tabKey) => ({
                key: tabKey,
                label:
                  tabKey === "leads"
                    ? `Leads (${data.leads.length})`
                    : tabKey === "expenses"
                      ? `Chi phí (${data.expenses.length})`
                      : `Doanh thu (${data.revenues.length})`,
                children:
                  tabKey === "leads" ? (
                    <LeadTable leads={data.leads} loading={loading} />
                  ) : tabKey === "expenses" ? (
                    <ExpenseTable expenses={data.expenses} loading={loading} />
                  ) : (
                    <RevenueTable revenues={data.revenues} loading={loading} />
                  ),
              })) as Parameters<typeof Tabs>[0]["items"]
            }
          />
        </>
      )}
    </Drawer>
  );
}

// ============================================================================
// Sub-tables
// ============================================================================

interface LeadTableProps {
  leads: DrillDownData["leads"];
  loading: boolean;
}

function LeadTable({ leads, loading }: LeadTableProps) {
  const columns: ColumnsType<DrillDownData["leads"][number]> = [
    {
      title: "Mã Lead",
      dataIndex: "leadCode",
      key: "leadCode",
      width: 120,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: "SĐT",
      dataIndex: "phone",
      key: "phone",
      width: 120,
    },
    {
      title: "Nguồn",
      dataIndex: "sourceType",
      key: "sourceType",
      width: 130,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
    },
    {
      title: "NV Marketing",
      dataIndex: "marketingEmployeeName",
      key: "marketingEmployeeName",
      width: 140,
    },
    {
      title: "Page",
      dataIndex: "facebookPageName",
      key: "facebookPageName",
      width: 120,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={leads}
      rowKey="_id"
      loading={loading}
      pagination={{ pageSize: 10, size: "small" }}
      size="small"
      scroll={{ x: 900 }}
    />
  );
}

interface ExpenseTableProps {
  expenses: DrillDownData["expenses"];
  loading: boolean;
}

function ExpenseTable({ expenses, loading }: ExpenseTableProps) {
  const columns: ColumnsType<DrillDownData["expenses"][number]> = [
    {
      title: "Ngày",
      dataIndex: "reportDate",
      key: "reportDate",
      width: 100,
    },
    {
      title: "NV Marketing",
      dataIndex: "marketingEmployeeName",
      key: "marketingEmployeeName",
      width: 140,
    },
    {
      title: "Page",
      dataIndex: "facebookPageName",
      key: "facebookPageName",
      width: 120,
    },
    {
      title: "Chi phí",
      dataIndex: "totalSpent",
      key: "totalSpent",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "Doanh thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "Lead",
      dataIndex: "totalLeads",
      key: "totalLeads",
      width: 80,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "ROAS",
      dataIndex: "roas",
      key: "roas",
      width: 80,
      align: "right",
      render: (val: number) => `${val.toFixed(2)}x`,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={expenses}
      rowKey="_id"
      loading={loading}
      pagination={{ pageSize: 10, size: "small" }}
      size="small"
      scroll={{ x: 760 }}
    />
  );
}

interface RevenueTableProps {
  revenues: DrillDownData["revenues"];
  loading: boolean;
}

function RevenueTable({ revenues, loading }: RevenueTableProps) {
  const columns: ColumnsType<DrillDownData["revenues"][number]> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      width: 120,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={revenues}
      rowKey="_id"
      loading={loading}
      pagination={{ pageSize: 10, size: "small" }}
      size="small"
      scroll={{ x: 660 }}
    />
  );
}

const MarketingDashboardDrillDownDrawer = memo(MarketingDashboardDrillDownDrawerInner);
export default MarketingDashboardDrillDownDrawer;
