/**
 * RecentOrders Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays the 5 most recent orders.
 * Memoized to avoid re-render when other widgets change.
 * Uses CardSection, DataTable, StatusBadge from UI Kit.
 */

import { memo, useMemo } from "react";
import { CardSection, DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentOrder } from "@/types/dashboard-activity";
import { formatCurrency } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type RecentOrdersProps = {
  data: RecentOrder[];
};

function RecentOrdersInner({ data }: RecentOrdersProps) {
  const lang = useLanguageStore((s) => s.language);
  const columns: Column[] = useMemo(
    () => [
      {
        key: "code",
        title: t("Mã đơn", lang),
        dataIndex: "code",
        width: 130,
      },
      {
        key: "customer",
        title: t("Khách hàng", lang),
        dataIndex: "customer",
      },
      {
        key: "status",
        title: t("Trạng thái", lang),
        dataIndex: "status",
        width: 130,
        render: (value: unknown) => (
          <StatusBadge status={String(value)} />
        ),
      },
      {
        key: "total",
        title: t("Tổng tiền", lang),
        dataIndex: "total",
        width: 140,
        align: "right",
        render: (value: unknown) => formatCurrency(Number(value)),
      },
    ],
    [lang]
  );

  const tableData = useMemo(
    () =>
      data.map((item) => ({
        id: item.id,
        code: item.code,
        customer: item.customer,
        status: item.status,
        total: item.total,
      })),
    [data]
  );

  return (
    <CardSection title={t("Đơn hàng mới nhất", lang)}>
      <DataTable
        columns={columns}
        data={tableData}
        pagination={false}
        rowKey="id"
        size="small"
        scroll={{ x: 520 }}
      />
    </CardSection>
  );
}

const RecentOrders = memo(RecentOrdersInner);
export default RecentOrders;