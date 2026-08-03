/**
 * RecentInventory Widget (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Displays the 5 most recent inventory changes.
 * Uses CardSection, DataTable from UI Kit.
 */

import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentInventory } from "@/types/dashboard-activity";
import { formatRelativeTime } from "@/lib/format";

export type RecentInventoryProps = {
  data: RecentInventory[];
};

export default function RecentInventory({ data }: RecentInventoryProps) {
  const columns: Column[] = [
    {
      key: "product",
      title: "Sản phẩm",
      dataIndex: "product",
    },
    {
      key: "type",
      title: "Loại",
      dataIndex: "type",
      width: 90,
      render: (value: unknown) => {
        const type = String(value);
        const isIn = type === "IN";
        const label = isIn ? "Nhập" : "Xuất";
        return (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: isIn ? "#f6ffed" : "#fff1f0",
              color: isIn ? "#52c41a" : "#ff4d4f",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: "quantity",
      title: "Số lượng",
      dataIndex: "quantity",
      width: 90,
      align: "right",
    },
    {
      key: "createdAt",
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 130,
      render: (value: unknown) => formatRelativeTime(String(value)),
    },
  ];

  const tableData = data.map((item) => ({
    id: item.id,
    product: item.product,
    type: item.type,
    quantity: item.quantity,
    createdAt: item.createdAt,
  }));

  return (
    <CardSection title="Thay đổi kho">
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