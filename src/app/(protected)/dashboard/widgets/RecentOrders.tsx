/**
 * RecentOrders Widget (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Displays the 5 most recent orders.
 * Uses CardSection, DataTable, StatusBadge from UI Kit.
 */

import { CardSection, DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentOrder } from "@/types/dashboard-activity";
import { formatCurrency } from "@/lib/format";

export type RecentOrdersProps = {
  data: RecentOrder[];
};

export default function RecentOrders({ data }: RecentOrdersProps) {
  const columns: Column[] = [
    {
      key: "code",
      title: "Mã đơn",
      dataIndex: "code",
      width: 130,
    },
    {
      key: "customer",
      title: "Khách hàng",
      dataIndex: "customer",
    },
    {
      key: "status",
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value: unknown) => (
        <StatusBadge status={String(value)} />
      ),
    },
    {
      key: "total",
      title: "Tổng tiền",
      dataIndex: "total",
      width: 140,
      align: "right",
      render: (value: unknown) => formatCurrency(Number(value)),
    },
  ];

  const tableData = data.map((item) => ({
    id: item.id,
    code: item.code,
    customer: item.customer,
    status: item.status,
    total: item.total,
  }));

  return (
    <CardSection title="Đơn hàng mới nhất">
      <DataTable
        columns={columns}
        data={tableData}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </CardSection>
  );
}