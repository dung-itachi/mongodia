/**
 * TopMarketingTable Component (Sprint 7.0 — Marketing Dashboard MongoDB)
 *
 * Displays top marketing channels ranked by ROAS.
 * Uses CardSection, DataTable from UI Kit.
 */

import { memo } from "react";
import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { TopMarketingChannel } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type TopMarketingTableProps = {
  data: TopMarketingChannel[];
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
      key: "marketingEmployeeName",
      title: "Marketing Channel",
      dataIndex: "marketingEmployeeName",
      render: (value: unknown, record: Record<string, unknown>) => (
        <span style={{ fontWeight: 500 }}>{value as string}</span>
      ),
    },
    {
      key: "totalSpent",
      title: "Chi phí",
      dataIndex: "totalSpent",
      width: 110,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "totalRevenue",
      title: "Doanh thu",
      dataIndex: "totalRevenue",
      width: 110,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
    {
      key: "roas",
      title: "ROAS",
      dataIndex: "roas",
      width: 80,
      align: "right",
      render: (value: unknown) => `${Number(value).toFixed(2)}x`,
    },
    {
      key: "totalLeads",
      title: "Leads",
      dataIndex: "totalLeads",
      width: 90,
      align: "right",
      render: (value: unknown) => formatNumber(Number(value)),
    },
  ];

  return (
    <CardSection title="Top Marketing Channels">
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        rowKey="marketingEmployeeId"
        size="small"
        scroll={{ x: 500 }}
      />
    </CardSection>
  );
}

const TopMarketingTable = memo(TopMarketingTableInner);
export default TopMarketingTable;
