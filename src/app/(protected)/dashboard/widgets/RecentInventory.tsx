/**
 * RecentInventory Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays the 5 most recent inventory changes.
 * Memoized to prevent re-render when other widgets change.
 * Uses CardSection, DataTable from UI Kit and CSS module for status pill.
 */

import { memo } from "react";
import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentInventory } from "@/types/dashboard-activity";
import { formatRelativeTime } from "@/lib/format";
import styles from "../dashboard.module.css";

export type RecentInventoryProps = {
  data: RecentInventory[];
};

function RecentInventoryInner({ data }: RecentInventoryProps) {
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
        const cls = isIn ? styles["d4-pill-in"] : styles["d4-pill-out"];
        return (
          <span
            className={`${styles["d4-pill"]} ${cls}`}
            aria-label={`Loại: ${label}`}
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
        scroll={{ x: 480 }}
      />
    </CardSection>
  );
}

const RecentInventory = memo(RecentInventoryInner);
export default RecentInventory;