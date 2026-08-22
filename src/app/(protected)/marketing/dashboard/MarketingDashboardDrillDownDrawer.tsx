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
import { useLanguageStore } from "@/store/language.store";
import type { Language } from "@/store/language.store";
import { t } from "@/lib/i18n";
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
  const lang = useLanguageStore((s) => s.language);
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
    ? `${t("Chi tiết:", lang)} ${context.label}`
    : t("Chi tiết Dashboard", lang);

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
          <p>{t("Đang tải dữ liệu...", lang)}</p>
        </div>
      )}

      {error && (
        <div className={styles["mk-drawer-error"]}>
          <p>{t("Không thể tải dữ liệu:", lang)} {error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div className={styles["mk-drawer-summary"]}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={t("Tổng Khách hàng", lang)}
                  value={data.summary.totalLeads}
                  formatter={(val) => formatNumber(Number(val))}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t("Chi phí", lang)}
                  value={data.summary.totalExpense}
                  formatter={(val) => formatNumber(Number(val))}
                  suffix="₫"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t("Doanh thu", lang)}
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
                    ? `${t("Khách hàng", lang)} (${data.leads.length})`
                    : tabKey === "expenses"
                      ? `${t("Chi phí", lang)} (${data.expenses.length})`
                      : `${t("Doanh thu", lang)} (${data.revenues.length})`,
                children:
                  tabKey === "leads" ? (
                    <LeadTable leads={data.leads} loading={loading} lang={lang} />
                  ) : tabKey === "expenses" ? (
                    <ExpenseTable expenses={data.expenses} loading={loading} lang={lang} />
                  ) : (
                    <RevenueTable revenues={data.revenues} loading={loading} lang={lang} />
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
  lang: Language;
}

function LeadTable({ leads, loading, lang }: LeadTableProps) {
  const columns: ColumnsType<DrillDownData["leads"][number]> = [
    {
      title: t("Mã Khách hàng", lang),
      dataIndex: "leadCode",
      key: "leadCode",
      width: 120,
    },
    {
      title: t("Khách hàng", lang),
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: t("SĐT", lang),
      dataIndex: "phone",
      key: "phone",
      width: 120,
    },
    {
      title: t("Nguồn", lang),
      dataIndex: "sourceType",
      key: "sourceType",
      width: 130,
    },
    {
      title: t("Trạng thái", lang),
      dataIndex: "status",
      key: "status",
      width: 120,
    },
    {
      title: t("NV Marketing", lang),
      dataIndex: "marketingEmployeeName",
      key: "marketingEmployeeName",
      width: 140,
    },
    {
      title: t("Page", lang),
      dataIndex: "facebookPageName",
      key: "facebookPageName",
      width: 120,
    },
    {
      title: t("Ngày tạo", lang),
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
  lang: Language;
}

function ExpenseTable({ expenses, loading, lang }: ExpenseTableProps) {
  const columns: ColumnsType<DrillDownData["expenses"][number]> = [
    {
      title: t("Ngày", lang),
      dataIndex: "reportDate",
      key: "reportDate",
      width: 100,
    },
    {
      title: t("NV Marketing", lang),
      dataIndex: "marketingEmployeeName",
      key: "marketingEmployeeName",
      width: 140,
    },
    {
      title: t("Page", lang),
      dataIndex: "facebookPageName",
      key: "facebookPageName",
      width: 120,
    },
    {
      title: t("Chi phí", lang),
      dataIndex: "totalSpent",
      key: "totalSpent",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: t("Doanh thu", lang),
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: t("Khách hàng", lang),
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
  lang: Language;
}

function RevenueTable({ revenues, loading, lang }: RevenueTableProps) {
  const columns: ColumnsType<DrillDownData["revenues"][number]> = [
    {
      title: t("Mã đơn", lang),
      dataIndex: "orderCode",
      key: "orderCode",
      width: 120,
    },
    {
      title: t("Khách hàng", lang),
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: t("Tổng tiền", lang),
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: t("Trạng thái", lang),
      dataIndex: "status",
      key: "status",
      width: 120,
    },
    {
      title: t("Ngày tạo", lang),
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
