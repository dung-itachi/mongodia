"use client";

import { useState, useMemo } from "react";
import { Select } from "antd";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseWorkflowInventory } from "@/hooks/useWarehouseWorkflow";
import WarehouseStats from "./components/WarehouseStats";
import LowStockAlert from "./components/LowStockAlert";
import { LOW_STOCK_THRESHOLD } from "./warehouse.constants";
import styles from "./warehouse-dashboard.module.css";

export type WarehouseStats = {
  totalSKU: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
};

export type LowStockItem = {
  key: string;
  name: string;
  sku?: string;
  warehouseName?: string;
  availableQuantity: number;
};

type InventoryItem = {
  _id: string;
  warehouseId?: { _id: string; name: string } | string;
  productId?: { _id: string; code?: string; name?: string } | null;
  variantId?: { _id: string; sku?: string } | null;
  giftId?: { _id: string; name?: string } | null;
  itemType: "PRODUCT" | "GIFT";
  quantity: number;
  availableQuantity: number;
  inTransitQuantity: number;
  reservedQuantity: number;
};

function getWarehouseId(warehouseId: { _id?: string } | string | undefined): string {
  if (!warehouseId) return "";
  if (typeof warehouseId === "string") return warehouseId;
  return warehouseId._id ?? "";
}

function computeStatsForWarehouse(
  warehouseId: string,
  inventory: InventoryItem[]
): WarehouseStats {
  const warehouseItems = inventory.filter(
    (item) => getWarehouseId(item.warehouseId) === warehouseId
  );

  return {
    totalSKU: warehouseItems.length,
    totalQuantity: warehouseItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    availableQuantity: warehouseItems.reduce((sum, item) => sum + (item.availableQuantity ?? 0), 0),
    reservedQuantity: warehouseItems.reduce((sum, item) => sum + (item.reservedQuantity ?? 0), 0),
    inTransitQuantity: warehouseItems.reduce((sum, item) => sum + (item.inTransitQuantity ?? 0), 0),
  };
}

function computeLowStockItems(
  inventory: InventoryItem[],
  warehouseNameMap: Map<string, string>
): LowStockItem[] {
  return inventory
    .filter((item) => (item.availableQuantity ?? 0) < LOW_STOCK_THRESHOLD && (item.availableQuantity ?? 0) > 0)
    .map((item) => {
      const wid = getWarehouseId(item.warehouseId);
      let name = "Không xác định";
      let sku: string | undefined;

      if (item.itemType === "GIFT") {
        name = (item.giftId as { name?: string } | null)?.name ?? "Quà tặng";
      } else {
        const product = item.productId as { code?: string; name?: string } | null;
        const variant = item.variantId as { sku?: string } | null;
        name = product?.name ?? product?.code ?? "Sản phẩm";
        sku = variant?.sku;
      }

      return {
        key: item._id,
        name,
        sku,
        warehouseName: warehouseNameMap.get(wid),
        availableQuantity: item.availableQuantity ?? 0,
      };
    })
    .slice(0, 10);
}

export default function WarehouseDashboardPage() {
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(undefined);

  const allInventory = useWarehouseWorkflowInventory({ limit: 500 });
  const inventoryData: InventoryItem[] = allInventory.data?.items ?? [];
  const loading = allInventory.isLoading;

  const warehouseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of warehouses) {
      map.set(w._id, w.name);
    }
    return map;
  }, [warehouses]);

  const filteredInventory = useMemo(() => {
    if (!selectedWarehouseId) return inventoryData;
    return inventoryData.filter(
      (item) => getWarehouseId(item.warehouseId) === selectedWarehouseId
    );
  }, [inventoryData, selectedWarehouseId]);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w: { isActive: boolean }) => w.isActive),
    [warehouses]
  );

  const perWarehouseStats = useMemo(() => {
    const map = new Map<string, WarehouseStats>();
    for (const w of activeWarehouses) {
      const stats = computeStatsForWarehouse(w._id, inventoryData);
      map.set(w._id, stats);
    }
    return map;
  }, [activeWarehouses, inventoryData]);

  const overallStats = useMemo(() => {
    let totalSKU = 0;
    let totalQuantity = 0;
    let availableQuantity = 0;
    let reservedQuantity = 0;
    let inTransitQuantity = 0;

    const statsSource = selectedWarehouseId ? filteredInventory : inventoryData;
    for (const item of statsSource) {
      totalSKU += 1;
      totalQuantity += item.quantity ?? 0;
      availableQuantity += item.availableQuantity ?? 0;
      reservedQuantity += item.reservedQuantity ?? 0;
      inTransitQuantity += item.inTransitQuantity ?? 0;
    }

    return { totalSKU, totalQuantity, availableQuantity, reservedQuantity, inTransitQuantity };
  }, [selectedWarehouseId, inventoryData, filteredInventory]);

  const lowStockItems = useMemo(
    () => computeLowStockItems(filteredInventory, warehouseNameMap),
    [filteredInventory, warehouseNameMap]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Kho"
        subtitle={warehousesLoading ? "Đang tải..." : `${activeWarehouses.length} kho đang hoạt động`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouse" },
          { label: "Dashboard" },
        ]}
      />

      <div className={styles["warehouse-page"]}>
        <div className={styles["warehouse-params"]}>
          <span className={styles["warehouse-params-text"]}>Kho:</span>
          <Select
            placeholder="Tất cả kho"
            allowClear
            style={{ width: 200 }}
            value={selectedWarehouseId}
            onChange={(value) => setSelectedWarehouseId(value)}
            options={[
              { value: "", label: "Tất cả kho" },
              ...activeWarehouses.map((w: { _id: string; name: string }) => ({
                value: w._id,
                label: w.name,
              })),
            ]}
          />
        </div>

        <WarehouseStats stats={overallStats} loading={loading} />

        {activeWarehouses.map((warehouse: { _id: string; code: string; name: string }) => {
          const stats = perWarehouseStats.get(warehouse._id);
          const isSelected = !selectedWarehouseId || selectedWarehouseId === warehouse._id;

          return (
            <CardSection
              key={warehouse._id}
              title={`Kho ${warehouse.name} (${warehouse.code})`}
            >
              <div style={{ marginBottom: 16 }}>
                <WarehouseStats stats={stats ?? { totalSKU: 0, totalQuantity: 0, availableQuantity: 0, reservedQuantity: 0, inTransitQuantity: 0 }} />
              </div>
              {isSelected && lowStockItems.length > 0 && (
                <LowStockAlert
                  items={lowStockItems.filter((item) => item.warehouseName === warehouse.name)}
                />
              )}
            </CardSection>
          );
        })}

        {selectedWarehouseId && lowStockItems.length > 0 && (
          <LowStockAlert items={lowStockItems} />
        )}
      </div>
    </PageContainer>
  );
}
