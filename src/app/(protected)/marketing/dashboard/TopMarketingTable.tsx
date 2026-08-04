/**
 * TopMarketingTable Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Displays top marketing performers ranked by lead count.
 * Uses CardSection, DataTable from UI Kit.
 *
 * TODO: Replace with richer UI showing avatar, conversion rate in Sprint Analytics.
 */

import { memo } from "react";
import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { TopMarketingItem } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type TopMarketingTableProps = {
  data: TopMarketingItem[];
};

function TopMarketingTableInner({ data }: TopMarketingTableProps) {
  const columns: Column[] = [
    {
      key: "rank",
      title: "#",
      width: 50,
      align: "center",
      render: (_value: unknown, _record: Record<string, unknown>, index: number) => index + 1,
    },
    {
      key: "employeeName",
      title: "Nhân viên Marketing",
      dataIndex: "employeeName",
      render: (value: unknown, record: Record<string, unknown>) => (
        <span style={{ fontWeight: 500 }}>{value as string}</span>
      ),
    },
    {
      key: "totalLead",
      title: "Tổng Leads",
      dataIndex: "totalLead",
      width: 110,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "closedLead",
      title: "Đã chốt",
      dataIndex: "closedLead",
      width: 100,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "conversionRate",
      title: "Tỷ lệ",
      dataIndex: "conversionRate",
      width: 90,
      align: "right",
      render: (value: unknown) => `${formatNumber(Number(value))}%`,
    },
  ];

  return (
    <CardSection title="Top Marketing">
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        rowKey="employeeId"
        size="small"
        scroll={{ x: 400 }}
      />
    </CardSection>
  );
}

const TopMarketingTable = memo(TopMarketingTableInner);
export default TopMarketingTable;