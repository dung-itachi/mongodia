/**
 * TopMarketingTable Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Displays top marketing performers ranked by lead count.
 * Uses CardSection, DataTable from UI Kit.
 */

import { memo, useMemo } from "react";
import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { TopMarketingItem } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type TopMarketingTableProps = {
  data: TopMarketingItem[];
};

function TopMarketingTableInner({ data }: TopMarketingTableProps) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: "rank",
        title: "#",
        width: 60,
        align: "center",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const index = data.findIndex(
            (item) => item.name === record["name"]
          );
          return index >= 0 ? index + 1 : "-";
        },
      },
      {
        key: "name",
        title: "Nhân viên Marketing",
        dataIndex: "name",
      },
      {
        key: "count",
        title: "Số leads",
        dataIndex: "count",
        width: 110,
        align: "right",
        render: (value: unknown) => formatNumber(Number(value)),
      },
    ],
    [data]
  );

  const tableData = useMemo(
    () => data.map((item) => ({ id: item.name, name: item.name, count: item.count })),
    [data]
  );

  return (
    <CardSection title="Top Marketing">
      <DataTable
        columns={columns}
        data={tableData}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={{ x: 380 }}
      />
    </CardSection>
  );
}

const TopMarketingTable = memo(TopMarketingTableInner);
export default TopMarketingTable;