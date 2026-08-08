"use client";

import { useState, useMemo } from "react";
import { Select, Space } from "antd";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import DataTable from "@/components/common/table/DataTable";
import TableToolbar from "@/components/common/table/TableToolbar";
import FilterBar from "@/components/common/filters/FilterBar";
import PermissionGate from "@/components/common/PermissionGate";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseWorkflowInventory } from "@/hooks/useWarehouseWorkflow";

export default function WarehouseInventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [itemType, setItemType] = useState<string | undefined>();

  const { warehouses } = useWarehouses();
  const filters = useMemo(() => ({ warehouseId, itemType, page, limit: pageSize }), [warehouseId, itemType, page, pageSize]);
  const { data, loading } = useWarehouseWorkflowInventory(filters);
  const items = data?.items ?? [];

  const columns = useMemo(() => [
    { key: "name", title: "Sản phẩm / Quà", render: (_: unknown, row: Record<string, unknown>) => {
      const variant = row.variantId as { sku?: string } | null;
      const product = row.productId as { code?: string; name?: string } | null;
      const gift = row.giftId as { name?: string } | null;
      if (row.itemType === "GIFT") return gift?.name ?? "Quà tặng";
      const variantLabel = variant?.sku ?? "Không có";
      const productLabel = product?.name ?? product?.code ?? "";
      return `${productLabel} • ${variantLabel}`;
    } },
    { key: "type", title: "Loại", dataIndex: "itemType", width: 100, render: (value: unknown) => value === "GIFT" ? "Quà tặng" : "Sản phẩm" },
    { key: "warehouse", title: "Kho", dataIndex: "warehouseId", width: 180, render: (value: unknown) => (value as { name?: string } | null)?.name ?? "-" },
    { key: "quantity", title: "Tồn kho", dataIndex: "quantity", width: 120, align: "right" as const, render: (value: unknown) => Number(value ?? 0) },
    { key: "inTransit", title: "Đang chuyển", dataIndex: "inTransitQuantity", width: 130, align: "right" as const, render: (value: unknown) => Number(value ?? 0) },
    { key: "shipped", title: "Đã xuất", dataIndex: "shippedQuantity", width: 120, align: "right" as const, render: (value: unknown) => Number(value ?? 0) },
    { key: "updated", title: "Cập nhật", dataIndex: "updatedAt", width: 160, render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN") },
  ], []);

  const filterItems = useMemo(() => [
    {
      key: "warehouseId", type: "select" as const, label: "Kho",
      options: [{ value: "", label: "Tất cả kho" }, ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))],
    },
    {
      key: "itemType", type: "select" as const, label: "Loại",
      options: [{ value: "", label: "Tất cả" }, { value: "PRODUCT", label: "Sản phẩm" }, { value: "GIFT", label: "Quà tặng" }],
    },
  ], [warehouses]);

  return (
    <PageContainer>
      <PageHeader title="Tồn kho" subtitle={`${data?.total ?? 0} dòng`} breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho", href: "/warehouses" }, { label: "Tồn kho" }]} />
      <div className="card">
        <TableToolbar
          actions={<FilterBar items={filterItems} values={{ warehouseId: warehouseId ?? "", itemType: itemType ?? "" }} onChange={(values) => {
            setWarehouseId(values.warehouseId ? String(values.warehouseId) : undefined);
            setItemType(values.itemType ? String(values.itemType) : undefined);
            setPage(1);
          }} />}
          onRefresh={() => undefined}
        />
        <Space style={{ marginBottom: 8 }}>
          <Select placeholder="Kho" allowClear style={{ width: 200 }} value={warehouseId} onChange={(value) => { setWarehouseId(value); setPage(1); }} options={[{ value: "", label: "Tất cả kho" }, ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))]} />
          <Select placeholder="Loại" allowClear style={{ width: 160 }} value={itemType} onChange={(value) => { setItemType(value); setPage(1); }} options={[{ value: "PRODUCT", label: "Sản phẩm" }, { value: "GIFT", label: "Quà tặng" }]} />
        </Space>
        <PermissionGate permission="inventory.view">
          <DataTable
            columns={columns}
            data={items as unknown as Record<string, unknown>[]}
            loading={loading}
            rowKey={(record: Record<string, unknown>) => {
              const warehouse = (record.warehouseId as { _id?: string } | null)?._id ?? String(record.warehouseId);
              const variant = (record.variantId as { _id?: string } | null)?._id ?? "";
              const product = (record.productId as { _id?: string } | null)?._id ?? "";
              const gift = (record.giftId as { _id?: string } | null)?._id ?? "";
              return `${warehouse}::${record.itemType}::${variant}::${product}::${gift}`;
            }}
            pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          />
        </PermissionGate>
      </div>
    </PageContainer>
  );
}
