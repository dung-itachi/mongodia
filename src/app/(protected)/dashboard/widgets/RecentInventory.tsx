/**
 * RecentInventory Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays the 5 most recent inventory changes.
 * Memoized to prevent re-render when other widgets change.
 * Uses CardSection, DataTable from UI Kit and CSS module for status pill.
 */

import { memo, useMemo } from "react";
import { CardSection, DataTable } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentInventory } from "@/types/dashboard-activity";
import { formatRelativeTime } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "../dashboard.module.css";

export type RecentInventoryProps = {
  data: RecentInventory[];
};

function RecentInventoryInner({ data }: RecentInventoryProps) {
  const lang = useLanguageStore((s) => s.language);
  const columns: Column[] = useMemo(
    () => [
      {
        key: "product",
        title: t("Sản phẩm", lang),
        dataIndex: "product",
      },
      {
        key: "type",
        title: t("Loại", lang),
        dataIndex: "type",
        width: 90,
        render: (value: unknown) => {
          const type = String(value);
          const isIn = type === "IN";
          const label = isIn ? t("Nhập", lang) : t("Xuất", lang);
          const cls = isIn ? styles["d4-pill-in"] : styles["d4-pill-out"];
          return (
            <span
              className={`${styles["d4-pill"]} ${cls}`}
              aria-label={`${t("Loại:", lang)} ${label}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: "quantity",
        title: t("Số lượng", lang),
        dataIndex: "quantity",
        width: 90,
        align: "right",
      },
      {
        key: "createdAt",
        title: t("Thời gian", lang),
        dataIndex: "createdAt",
        width: 130,
        render: (value: unknown) => formatRelativeTime(String(value)),
      },
    ],
    [lang]
  );

  const tableData = data.map((item) => ({
    id: item.id,
    product: item.product,
    type: item.type,
    quantity: item.quantity,
    createdAt: item.createdAt,
  }));

  return (
    <CardSection title={t("Thay đổi kho", lang)}>
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