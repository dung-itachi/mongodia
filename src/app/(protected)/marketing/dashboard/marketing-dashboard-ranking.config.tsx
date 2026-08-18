/**
 * Marketing Dashboard Ranking Config (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven ranking/table definitions.
 * Add/remove rankings by modifying this array.
 */

import type { Column } from "@/components/common/table/DataTable";
import type {
  RankingData,
  TopFacebookPageItem,
  TopMarketingEmployeeItem,
  TopCampaignItem,
} from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type RankingPermission =
  | "marketing.dashboard.ranking"
  | "marketing.dashboard.expense"
  | "marketing.dashboard.revenue";

export type RankingType = "facebookPages" | "marketingEmployees" | "campaigns";

interface RankingDefinition<T> {
  id: string;
  title: string;
  type: RankingType;
  selector: (data: RankingData) => T[];
  columns: Column[];
  permission: RankingPermission;
  drillDown?: boolean;
  exportable?: boolean;
}

function formatCurrency(value: number): string {
  return formatNumber(value);
}

function formatRoas(value: number): string {
  return `${value.toFixed(2)}x`;
}

// Facebook Pages Ranking
export const facebookPagesColumns: Column[] = [
  {
    key: "pageName",
    title: "Page",
    dataIndex: "pageName",
    render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
  },
  {
    key: "totalLeads",
    title: "Lead",
    dataIndex: "totalLeads",
    width: 80,
    align: "right",
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "totalRevenue",
    title: "Revenue",
    dataIndex: "totalRevenue",
    width: 120,
    align: "right",
    render: (value: unknown) => formatCurrency(Number(value)),
  },
  {
    key: "roas",
    title: "ROAS",
    dataIndex: "roas",
    width: 80,
    align: "right",
    render: (value: unknown) => formatRoas(Number(value)),
  },
];

// Marketing Employees Ranking
export const marketingEmployeesColumns: Column[] = [
  {
    key: "employeeName",
    title: "Employee",
    dataIndex: "employeeName",
    render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
  },
  {
    key: "totalLeads",
    title: "Lead",
    dataIndex: "totalLeads",
    width: 70,
    align: "right",
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "qualifiedLeads",
    title: "Qualified",
    dataIndex: "qualifiedLeads",
    width: 90,
    align: "right",
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "closedLeads",
    title: "Closed",
    dataIndex: "closedLeads",
    width: 80,
    align: "right",
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "revenue",
    title: "Revenue",
    dataIndex: "revenue",
    width: 120,
    align: "right",
    render: (value: unknown) => formatCurrency(Number(value)),
  },
];

// Campaigns Ranking
export const campaignsColumns: Column[] = [
  {
    key: "campaignName",
    title: "Chiến dịch",
    dataIndex: "campaignName",
    render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
  },
  {
    key: "totalSpent",
    title: "Chi phí",
    dataIndex: "totalSpent",
    width: 110,
    align: "right",
    render: (value: unknown) => formatCurrency(Number(value)),
  },
  {
    key: "totalRevenue",
    title: "Doanh thu",
    dataIndex: "totalRevenue",
    width: 120,
    align: "right",
    render: (value: unknown) => formatCurrency(Number(value)),
  },
  {
    key: "roas",
    title: "ROAS",
    dataIndex: "roas",
    width: 80,
    align: "right",
    render: (value: unknown) => formatRoas(Number(value)),
  },
  {
    key: "totalLeads",
    title: "Lead",
    dataIndex: "totalLeads",
    width: 70,
    align: "right",
    render: (value: unknown) => formatNumber(Number(value)),
  },
];

export const MARKETING_DASHBOARD_RANKINGS: RankingDefinition<unknown>[] = [
  {
    id: "topFacebookPages",
    title: "Top Facebook Pages",
    type: "facebookPages",
    selector: (data) => data.topFacebookPages,
    columns: facebookPagesColumns,
    permission: "marketing.dashboard.ranking",
    drillDown: true,
    exportable: true,
  },
  {
    id: "topMarketingEmployees",
    title: "Top Marketing Employees",
    type: "marketingEmployees",
    selector: (data) => data.topMarketingEmployees,
    columns: marketingEmployeesColumns,
    permission: "marketing.dashboard.ranking",
    drillDown: true,
    exportable: true,
  },
  {
    id: "topCampaigns",
    title: "Top Chiến dịch",
    type: "campaigns",
    selector: (data) => data.topCampaigns,
    columns: campaignsColumns,
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
  },
];

export type { RankingData, TopFacebookPageItem, TopMarketingEmployeeItem, TopCampaignItem };
