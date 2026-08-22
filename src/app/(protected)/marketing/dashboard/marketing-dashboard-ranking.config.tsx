/**
 * Marketing Dashboard Ranking Config (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven ranking/table definitions.
 * Add/remove rankings by modifying this array.
 */

import { t } from "@/lib/i18n";
import type { Language } from "@/store/language.store";
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
  titleKey: string;
  type: RankingType;
  selector: (data: RankingData) => T[];
  buildColumns: (lang: Language) => Column[];
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
export function buildFacebookPagesColumns(lang: Language): Column[] {
  return [
    {
      key: "pageName",
      title: t("Page", lang),
      dataIndex: "pageName",
      render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
    },
    {
      key: "totalLeads",
      title: t("Khách hàng", lang),
      dataIndex: "totalLeads",
      width: 80,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "totalRevenue",
      title: t("Revenue", lang),
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
}

// Marketing Employees Ranking
export function buildMarketingEmployeesColumns(lang: Language): Column[] {
  return [
    {
      key: "employeeName",
      title: t("Employee", lang),
      dataIndex: "employeeName",
      render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
    },
    {
      key: "totalLeads",
      title: t("Khách hàng", lang),
      dataIndex: "totalLeads",
      width: 70,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "qualifiedLeads",
      title: t("Qualified", lang),
      dataIndex: "qualifiedLeads",
      width: 90,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "closedLeads",
      title: t("Closed", lang),
      dataIndex: "closedLeads",
      width: 80,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "revenue",
      title: t("Revenue", lang),
      dataIndex: "revenue",
      width: 120,
      align: "right",
      render: (value: unknown) => formatCurrency(Number(value)),
    },
  ];
}

// Campaigns Ranking
export function buildCampaignsColumns(lang: Language): Column[] {
  return [
    {
      key: "campaignName",
      title: t("Chiến dịch", lang),
      dataIndex: "campaignName",
      render: (value: unknown) => <span style={{ fontWeight: 500 }}>{value as string}</span>,
    },
    {
      key: "totalSpent",
      title: t("Chi phí", lang),
      dataIndex: "totalSpent",
      width: 110,
      align: "right",
      render: (value: unknown) => formatCurrency(Number(value)),
    },
    {
      key: "totalRevenue",
      title: t("Doanh thu", lang),
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
      title: t("Khách hàng", lang),
      dataIndex: "totalLeads",
      width: 70,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
  ];
}

export const MARKETING_DASHBOARD_RANKINGS: RankingDefinition<unknown>[] = [
  {
    id: "topFacebookPages",
    titleKey: "Top Facebook Pages",
    type: "facebookPages",
    selector: (data) => data.topFacebookPages,
    buildColumns: buildFacebookPagesColumns,
    permission: "marketing.dashboard.ranking",
    drillDown: true,
    exportable: true,
  },
  {
    id: "topMarketingEmployees",
    titleKey: "Top Marketing Employees",
    type: "marketingEmployees",
    selector: (data) => data.topMarketingEmployees,
    buildColumns: buildMarketingEmployeesColumns,
    permission: "marketing.dashboard.ranking",
    drillDown: true,
    exportable: true,
  },
  {
    id: "topCampaigns",
    titleKey: "Top Chiến dịch",
    type: "campaigns",
    selector: (data) => data.topCampaigns,
    buildColumns: buildCampaignsColumns,
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
  },
];

export type { RankingData, TopFacebookPageItem, TopMarketingEmployeeItem, TopCampaignItem };
