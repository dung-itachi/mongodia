/**
 * Product Variant Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Product Variants.
 * Shows product name, SKU, and variant attributes clearly.
 */

"use client";

import { useCallback, useMemo } from "react";
import { Switch, Popconfirm, Tag, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { ProductVariantListItem } from "@/hooks/useVariants";

interface ProductVariantTableProps {
  data: ProductVariantListItem[];
  loading?: boolean;
  onEdit: (item: ProductVariantListItem) => void;
  onDelete: (item: ProductVariantListItem) => void;
  onToggleActive?: (item: ProductVariantListItem) => void;
}

interface VariantValueWithOption {
  _id: string;
  code: string;
  name: string;
  optionId: string;
  optionName: string;
}

export default function ProductVariantTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: ProductVariantTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const getProductInfo = useCallback((productId: ProductVariantListItem["productId"]) => {
    if (typeof productId === "object" && productId !== null) {
      return {
        name: (productId as { name: string }).name,
        code: (productId as { code: string }).code || "",
      };
    }
    return { name: "-", code: "" };
  }, []);

  const parseVariantValues = useCallback(
    (variantValues: ProductVariantListItem["variantValues"]): VariantValueWithOption[] => {
      if (!Array.isArray(variantValues) || variantValues.length === 0) {
        return [];
      }
      return variantValues
        .map((v) => {
          if (typeof v === "object" && v !== null) {
            const obj = v as Record<string, unknown>;
            const variantOptionId = obj.variantOptionId;
            let optionId = "";
            let optionName = "";

            if (typeof variantOptionId === "object" && variantOptionId !== null) {
              const optionObj = variantOptionId as Record<string, unknown>;
              optionId = (optionObj._id as string) || "";
              optionName = (optionObj.name as string) || "";
            }

            return {
              _id: (obj._id as string) || "",
              code: (obj.code as string) || "",
              name: (obj.name as string) || "",
              optionId,
              optionName,
            };
          }
          return null;
        })
        .filter((v): v is VariantValueWithOption => v !== null);
    },
    []
  );

  const groupVariantValuesByOption = useCallback(
    (variantValues: VariantValueWithOption[]) => {
      const groups: Record<string, { optionName: string; values: VariantValueWithOption[] }> = {};
      for (const vv of variantValues) {
        if (!groups[vv.optionId]) {
          groups[vv.optionId] = { optionName: vv.optionName || vv.optionId, values: [] };
        }
        groups[vv.optionId].values.push(vv);
      }
      return groups;
    },
    []
  );

  const formatVariantDisplay = useCallback(
    (variantValues: ProductVariantListItem["variantValues"]) => {
      const parsed = parseVariantValues(variantValues);
      if (parsed.length === 0) {
        return <span style={{ color: "#999" }}>{t("Không có thuộc tính", lang)}</span>;
      }

      const groups = groupVariantValuesByOption(parsed);

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(groups).map(([optionId, group]) => (
            <div key={optionId} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#666", fontSize: 12, minWidth: 60 }}>{group.optionName}:</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {group.values.map((vv) => (
                  <Tag
                    key={vv._id}
                    color="blue"
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {vv.name}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    },
    [parseVariantValues, groupVariantValuesByOption, lang]
  );

  const handleToggleActive = useCallback(
    (item: ProductVariantListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "product",
      title: t("Sản phẩm", lang),
      width: 180,
      fixed: "left",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        const productInfo = getProductInfo(item.productId);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Tooltip title={productInfo.name}>
              <span style={{
                fontWeight: 500,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block"
              }}>
                {productInfo.name}
              </span>
            </Tooltip>
            {productInfo.code && (
              <span style={{ fontSize: 11, color: "#999" }}>
                {productInfo.code}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "sku",
      title: "SKU",
      dataIndex: "sku",
      width: 130,
      render: (value: unknown) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "barcode",
      title: "Barcode",
      dataIndex: "barcode",
      width: 120,
      render: (value: unknown) => (
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "variantValues",
      title: t("Thuộc tính biến thể", lang),
      width: 280,
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return formatVariantDisplay(item.variantValues);
      },
    },
    // Sprint 8.x: Combo giữ giá, biến thể chỉ mô tả SKU/variant values.
    // Ẩn cột "Giá" vì variant không có giá — giá nằm ở Combo.
    {
      key: "isActive",
      title: t("Kích hoạt", lang),
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return (
          <Switch
            checked={item.isActive !== false}
            onChange={() => handleToggleActive(item)}
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
        const item = record as unknown as ProductVariantListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title={t("Xóa biến thể?", lang)}
              description={t("Biến thể sẽ bị xóa.", lang)}
              onConfirm={() => onDelete(item)}
              okText={t("Xóa", lang)}
              cancelText={t("Hủy", lang)}
              okButtonProps={{ danger: true }}
            >
              <DeleteOutlined
                style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 16 }}
              />
            </Popconfirm>
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
      emptyText={t("Chưa có biến thể nào", lang)}
      scroll={{ y: 400 }}
    />
  );
}
