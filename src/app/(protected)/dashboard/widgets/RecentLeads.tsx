/**
 * RecentLeads Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays the 5 most recent leads.
 * Memoized to avoid re-render when other widgets change.
 * Uses CardSection, DataTable, StatusBadge from UI Kit.
 */

import { memo, useMemo } from "react";
import { CardSection, DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { RecentLead } from "@/types/dashboard-activity";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type RecentLeadsProps = {
  data: RecentLead[];
};

function RecentLeadsInner({ data }: RecentLeadsProps) {
  const lang = useLanguageStore((s) => s.language);
  const columns: Column[] = useMemo(
    () => [
      {
        key: "name",
        title: t("Tên", lang),
        dataIndex: "name",
      },
      {
        key: "source",
        title: t("Nguồn", lang),
        dataIndex: "source",
        width: 110,
      },
      {
        key: "sale",
        title: t("Sale", lang),
        dataIndex: "sale",
        width: 150,
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
    ],
    [lang]
  );

  const tableData = useMemo(
    () =>
      data.map((item) => ({
        id: item.id,
        name: item.name,
        source: item.source,
        sale: item.sale,
        status: item.status,
      })),
    [data]
  );

  return (
    <CardSection title={t("Khách hàng mới", lang)}>
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

const RecentLeads = memo(RecentLeadsInner);
export default RecentLeads;