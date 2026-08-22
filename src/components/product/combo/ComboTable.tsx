/**
 * Combo Table Component (Sprint 8.x)
 *
 * Hiển thị danh sách Combo với các field:
 * - Ảnh, Mã, Tên combo
 * - Sản phẩm (Product)
 * - SL SP/combo, Giá bán, SL quà/combo
 * - Trạng thái, Thao tác
 *
 * Combo KHÔNG hiển thị variant ở đây (Sale sẽ chọn trong Order).
 */

"use client";

import { useCallback } from "react";
import { Switch, Image, Tag } from "antd";
import { EditOutlined, DeleteOutlined, GiftOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { ComboListItem } from "@/hooks/useCombos";
import { formatMNT } from "@/lib/format";

interface ComboTableProps {
  data: ComboListItem[];
  loading?: boolean;
  onEdit: (item: ComboListItem) => void;
  onDelete: (item: ComboListItem) => void;
  onToggleActive?: (item: ComboListItem, checked: boolean) => void;
}

export default function ComboTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: ComboTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const getProductName = useCallback((product: ComboListItem["product"]) => {
    if (typeof product === "object" && product !== null) {
      return (product as { name: string }).name;
    }
    return "-";
  }, []);

  const getProductCode = useCallback((product: ComboListItem["product"]) => {
    if (typeof product === "object" && product !== null) {
      return (product as { code: string }).code;
    }
    return "";
  }, []);

  const columns: Column[] = [
    {
      key: "image",
      title: t("Ảnh", lang),
      width: 70,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ComboListItem;
        if (item.image) {
          return (
            <Image
              src={item.image}
              alt={item.name}
              width={40}
              height={40}
              style={{ objectFit: "cover", borderRadius: 4 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
            />
          );
        }
        return <GiftOutlined style={{ color: "#999", fontSize: 20 }} />;
      },
    },
    {
      key: "code",
      title: t("Mã", lang),
      dataIndex: "code",
      width: 120,
    },
    {
      key: "name",
      title: t("Tên combo", lang),
      dataIndex: "name",
    },
    {
      key: "product",
      title: t("Sản phẩm", lang),
      width: 180,
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ComboListItem;
        return (
          <div>
            <div>{getProductName(item.product)}</div>
            {getProductCode(item.product) && (
              <div style={{ fontSize: 12, color: "#999" }}>{getProductCode(item.product)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "packageQuantity",
      title: t("SL SP", lang),
      dataIndex: "packageQuantity",
      width: 80,
      align: "center",
    },
    {
      key: "giftQuantity",
      title: t("SL quà", lang),
      dataIndex: "giftQuantity",
      width: 80,
      align: "center",
      render: (value: unknown) => {
        if (typeof value === "number" && value > 0) {
          return <Tag color="purple">{value}</Tag>;
        }
        return <span style={{ color: "#999" }}>0</span>;
      },
    },
    {
      key: "sellingPrice",
      title: t("Giá bán", lang),
      dataIndex: "sellingPrice",
      width: 120,
      align: "right",
      render: (value: unknown) => {
        if (typeof value === "number") {
          return (
            <span style={{ color: "#52c41a", fontWeight: 500 }}>
              {formatMNT(value)}
            </span>
          );
        }
        return "-";
      },
    },
    {
      key: "isActive",
      title: t("Trạng thái", lang),
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ComboListItem;
        const active = item.isActive !== false;
        return (
          <Switch
            checked={active}
            onChange={(checked) => onToggleActive?.(item, checked)}
            checkedChildren={t("Active", lang)}
            unCheckedChildren={t("Off", lang)}
            size="small"
          />
        );
      },
    },
    {
      key: "actions",
      title: t("Thao tác", lang),
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ComboListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            {/* Confirm dialog thật được handle ở ComboPage (modal.confirm) để
                hiển thị đầy đủ cảnh báo + đếm số đơn bị ảnh hưởng. */}
            <DeleteOutlined
              style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 16 }}
              onClick={() => onDelete(item)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      rowKey="_id"
      pagination={false}
      emptyText={t("Chưa có combo nào", lang)}
      scroll={{ y: 400 }}
    />
  );
}