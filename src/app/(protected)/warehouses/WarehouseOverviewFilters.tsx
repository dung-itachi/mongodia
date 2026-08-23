/**
 * WarehouseOverviewFilters Component
 *
 * Thanh filter + search cho section "Quản lý kho" (WarehouseOverviewCard).
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ [🔍 Tìm theo mã/tên SP]   Kho ▼   Tồn kho ▼   [↻]                │
 *   └────────────────────────────────────────────────────────────────────┘
 */

import { Input, Select, Space, Button } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type WarehouseOverviewStockFilter =
  | "all"
  | "in_stock"
  | "out_of_stock"
  | "low_stock";

export type WarehouseOverviewFiltersValue = {
  search: string;
  warehouseId: string | undefined;
  stock: WarehouseOverviewStockFilter;
};

export type WarehouseOverviewFiltersProps = {
  value: WarehouseOverviewFiltersValue;
  onChange: (next: WarehouseOverviewFiltersValue) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  warehouses: Array<{ _id: string; code: string; name: string }>;
};

export default function WarehouseOverviewFilters({
  value,
  onChange,
  onRefresh,
  refreshing,
  warehouses,
}: WarehouseOverviewFiltersProps) {
  const lang = useLanguageStore((s) => s.language);

  const stockOptions = [
    { value: "all", label: t("Tất cả tồn kho", lang) },
    { value: "in_stock", label: t("Còn hàng (>0)", lang) },
    { value: "out_of_stock", label: t("Hết hàng (=0)", lang) },
    { value: "low_stock", label: t("Tồn thấp (≤10)", lang) },
  ] as Array<{ value: WarehouseOverviewStockFilter; label: string }>;

  const warehouseOptions = [
    { value: "", label: t("Tất cả kho", lang) },
    ...warehouses.map((w) => ({
      value: w._id,
      label: `${w.code} · ${w.name}`,
    })),
  ];

  return (
    <Space size="middle" wrap style={{ marginBottom: 12, width: "100%" }}>
      <Input
        allowClear
        placeholder={t("Tìm theo mã hoặc tên SP", lang)}
        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
        value={value.search}
        onChange={(e) =>
          onChange({ ...value, search: e.target.value })
        }
        style={{ width: 280 }}
      />
      <Select
        value={value.warehouseId ?? ""}
        onChange={(v: string) =>
          onChange({
            ...value,
            warehouseId: v === "" ? undefined : v,
          })
        }
        options={warehouseOptions}
        placeholder={t("Chọn kho", lang)}
        style={{ minWidth: 200 }}
        showSearch
        optionFilterProp="label"
      />
      <Select
        value={value.stock}
        onChange={(v: WarehouseOverviewStockFilter) =>
          onChange({ ...value, stock: v })
        }
        options={stockOptions}
        style={{ minWidth: 160 }}
      />
      {onRefresh && (
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={refreshing}
        >
          {t("Làm mới", lang)}
        </Button>
      )}
    </Space>
  );
}