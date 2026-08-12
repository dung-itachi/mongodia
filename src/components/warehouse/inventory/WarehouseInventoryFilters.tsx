"use client";

import { Select, Input } from "antd";
import type { ChangeEvent } from "react";
import { useMemo } from "react";
import type { WarehouseInventoryFilters } from "@/hooks/useWarehouseInventory";

const { Search } = Input;

export interface WarehouseInventoryFilterProps {
  filters: WarehouseInventoryFilters;
  onChange: (filters: WarehouseInventoryFilters) => void;
  products: Array<{ _id: string; code: string; name: string }>;
  gifts: Array<{ _id: string; name: string }>;
  warehouses: Array<{ _id: string; code: string; name: string }>;
  variants: Array<{
    _id: string;
    sku: string;
    productId?: string | { _id: string };
  }>;
  loading?: boolean;
  showProductFilter?: boolean;
  showVariantFilter?: boolean;
  showGiftFilter?: boolean;
}

export default function WarehouseInventoryFilters({
  filters,
  onChange,
  products,
  gifts,
  warehouses,
  variants,
  loading,
  showProductFilter = true,
  showVariantFilter = true,
  showGiftFilter = true,
}: WarehouseInventoryFilterProps) {
  const warehouseOptions = useMemo(() => [
    { value: "", label: "Tất cả kho" },
    ...warehouses.map((w) => ({ value: w._id, label: w.name })),
  ], [warehouses]);

  const itemTypeOptions = useMemo(() => [
    { value: "", label: "Tất cả loại" },
    { value: "PRODUCT", label: "Sản phẩm" },
    { value: "GIFT", label: "Quà tặng" },
  ], []);

  const productOptions = useMemo(() => [
    { value: "", label: "Tất cả sản phẩm" },
    ...products.map((p) => ({ value: p._id, label: `${p.name} (${p.code})` })),
  ], [products]);

  const giftOptions = useMemo(() => [
    { value: "", label: "Tất cả quà tặng" },
    ...gifts.map((g) => ({ value: g._id, label: g.name })),
  ], [gifts]);

  const filteredVariants = useMemo(() => {
    if (!filters.productId) return variants;
    return variants.filter((v) => {
      const vpId = v.productId;
      const variantProductId = typeof vpId === "object" && vpId !== null ? vpId._id : vpId;
      return variantProductId === filters.productId;
    });
  }, [variants, filters.productId]);

  const variantOptions = useMemo(() => [
    { value: "", label: "Tất cả biến thể" },
    ...filteredVariants.map((v) => ({ value: v._id, label: v.sku || v._id })),
  ], [filteredVariants]);

  const handleChange = (key: keyof WarehouseInventoryFilters, value: string) => {
    const newFilters = { ...filters };

    if (key === "itemType") {
      newFilters.itemType = value as WarehouseInventoryFilters["itemType"];
      if (value !== "GIFT") {
        delete newFilters.giftId;
      } else {
        delete newFilters.productId;
        delete newFilters.variantId;
      }
    } else if (key === "productId") {
      newFilters.productId = value || undefined;
      delete newFilters.variantId;
    } else if (key === "variantId") {
      newFilters.variantId = value || undefined;
    } else if (key === "giftId") {
      newFilters.giftId = value || undefined;
    } else if (key === "warehouseId") {
      newFilters.warehouseId = value || undefined;
    }

    newFilters.page = 1;
    onChange(newFilters);
  };

  const handleSearch = (value: string) => {
    onChange({ ...filters, search: value || undefined, page: 1 });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!newValue) {
      onChange({ ...filters, search: undefined, page: 1 });
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
      <Search
        placeholder="Tìm kiếm sản phẩm, SKU, quà..."
        allowClear
        style={{ width: 260 }}
        value={filters.search ?? ""}
        onSearch={handleSearch}
        onChange={handleSearchChange}
      />

      <Select
        placeholder="Kho"
        allowClear
        style={{ width: 180 }}
        value={filters.warehouseId}
        onChange={(value) => handleChange("warehouseId", value ?? "")}
        options={warehouseOptions}
        loading={loading}
      />

      <Select
        placeholder="Loại"
        allowClear
        style={{ width: 140 }}
        value={filters.itemType}
        onChange={(value) => handleChange("itemType", value ?? "")}
        options={itemTypeOptions}
      />

      {showProductFilter && filters.itemType !== "GIFT" && (
        <Select
          placeholder="Sản phẩm"
          allowClear
          showSearch
          filterOption={(input, option) =>
            Boolean((option?.label ?? "").toLowerCase().includes(input.toLowerCase()))
          }
          style={{ width: 200 }}
          value={filters.productId}
          onChange={(value) => handleChange("productId", value ?? "")}
          options={productOptions}
          loading={loading}
        />
      )}

      {showVariantFilter && filters.itemType !== "GIFT" && filters.productId && (
        <Select
          placeholder="Biến thể"
          allowClear
          showSearch
          filterOption={(input, option) =>
            Boolean((option?.label ?? "").toLowerCase().includes(input.toLowerCase()))
          }
          style={{ width: 160 }}
          value={filters.variantId}
          onChange={(value) => handleChange("variantId", value ?? "")}
          options={variantOptions}
          loading={loading}
        />
      )}

      {showGiftFilter && filters.itemType === "GIFT" && (
        <Select
          placeholder="Quà tặng"
          allowClear
          showSearch
          filterOption={(input, option) =>
            Boolean((option?.label ?? "").toLowerCase().includes(input.toLowerCase()))
          }
          style={{ width: 200 }}
          value={filters.giftId}
          onChange={(value) => handleChange("giftId", value ?? "")}
          options={giftOptions}
          loading={loading}
        />
      )}
    </div>
  );
}
