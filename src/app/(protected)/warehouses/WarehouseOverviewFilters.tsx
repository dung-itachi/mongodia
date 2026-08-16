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

const STOCK_OPTIONS: Array<{
  value: WarehouseOverviewStockFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả tồn kho" },
  { value: "in_stock", label: "Còn hàng (>0)" },
  { value: "out_of_stock", label: "Hết hàng (=0)" },
  { value: "low_stock", label: "Tồn thấp (≤10)" },
];

export default function WarehouseOverviewFilters({
  value,
  onChange,
  onRefresh,
  refreshing,
  warehouses,
}: WarehouseOverviewFiltersProps) {
  const warehouseOptions = [
    { value: "", label: "Tất cả kho" },
    ...warehouses.map((w) => ({
      value: w._id,
      label: `${w.code} · ${w.name}`,
    })),
  ];

  return (
    <Space size="middle" wrap style={{ marginBottom: 12, width: "100%" }}>
      <Input
        allowClear
        placeholder="Tìm theo mã hoặc tên SP"
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
        placeholder="Chọn kho"
        style={{ minWidth: 200 }}
        showSearch
        optionFilterProp="label"
      />
      <Select
        value={value.stock}
        onChange={(v: WarehouseOverviewStockFilter) =>
          onChange({ ...value, stock: v })
        }
        options={STOCK_OPTIONS}
        style={{ minWidth: 160 }}
      />
      {onRefresh && (
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={refreshing}
        >
          Làm mới
        </Button>
      )}
    </Space>
  );
}