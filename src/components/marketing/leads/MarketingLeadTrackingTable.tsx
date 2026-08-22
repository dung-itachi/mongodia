"use client";

/**
 * Marketing Lead Tracking Table Component (Sprint 8.5)
 *
 * Table for displaying leads for marketing tracking.
 * Marketing can only VIEW, cannot update status.
 */

import { memo, useMemo } from "react";
import { EyeOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import type { MarketingLeadTracking } from "@/hooks/useMarketingLeadTracking";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./marketing-tracking.module.css";

export interface MarketingLeadTrackingTableProps {
  data: MarketingLeadTracking[];
  onView?: (lead: MarketingLeadTracking) => void;
  loading?: boolean;
}

function MarketingLeadTrackingTableInner({
  data,
  onView,
  loading,
}: MarketingLeadTrackingTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const columns: Column[] = useMemo(
    () => [
      {
        key: "leadCode",
        title: t("Mã", lang),
        dataIndex: "leadCode",
        width: 130,
      },
      {
        key: "customerName",
        title: t("Tên khách hàng", lang),
        dataIndex: "customerName",
        width: 180,
        render: (value: unknown) => (
          <span className={styles.primaryText}>{String(value)}</span>
        ),
      },
      {
        key: "phone",
        title: t("SĐT", lang),
        dataIndex: "phone",
        width: 120,
        render: (value: unknown) => (
          <span className={styles.phoneText}>{String(value) || "-"}</span>
        ),
      },
      {
        key: "saleEmployee",
        title: t("Sale phụ trách", lang),
        width: 140,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return lead.saleEmployeeId?.name || <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "sourceType",
        title: t("Nguồn", lang),
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType;
        },
      },
      {
        key: "product",
        title: t("Sản phẩm", lang),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return lead.product?.name || "-";
        },
      },
      {
        key: "price",
        title: t("Giá", lang),
        width: 120,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          if (lead.unitPriceMNT) {
            return (
              <span className={styles.priceText}>
                {lead.unitPriceMNT.toLocaleString("vi-VN")} ₮
              </span>
            );
          }
          return "-";
        },
      },
      {
        key: "status",
        title: t("Trạng thái", lang),
        dataIndex: "status",
        width: 140,
        render: (value: unknown) => (
          <StatusBadge status={String(value)} />
        ),
      },
      {
        key: "isConverted",
        title: t("Đơn", lang),
        width: 100,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          if (lead.isConverted) {
            return (
              <span className={styles.convertedBadge}>
                ✓ {t("Đã tạo", lang)}
              </span>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "createdAt",
        title: t("Ngày tạo", lang),
        dataIndex: "createdAt",
        width: 110,
        render: (value: unknown) =>
          value ? new Date(String(value)).toLocaleDateString("vi-VN") : "-",
      },
      {
        key: "actions",
        title: t("Thao tác", lang),
        width: 100,
        align: "center" as const,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(lead)}
              disabled={!onView}
            >
              {t("Chi tiết", lang)}
            </Button>
          );
        },
      },
    ],
    [onView, lang]
  );

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      pagination={false}
      rowKey="_id"
      size="small"
      scroll={{ x: 1400 }}
    />
  );
}

const MarketingLeadTrackingTable = memo(MarketingLeadTrackingTableInner);
export default MarketingLeadTrackingTable;
