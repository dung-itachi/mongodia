"use client";

import { useState, useMemo } from "react";
import { Select, Space } from "antd";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import { Table, Tag } from "antd";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseMovements } from "@/hooks/useWarehouseWorkflow";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  IMPORT: { label: "Nhập", color: "green" },
  TRANSFER_OUT: { label: "Chuyển đi", color: "gold" },
  TRANSFER_IN: { label: "Nhận chuyển", color: "blue" },
  ORDER_OUT: { label: "Xuất đơn", color: "volcano" },
  ORDER_RETURN: { label: "Hoàn đơn", color: "purple" },
  ADJUSTMENT: { label: "Điều chỉnh", color: "magenta" },
};

export default function WarehouseMovementsPage() {
  const { warehouses } = useWarehouses();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();

  const filters = useMemo(() => ({ warehouseId, type, page, limit: pageSize }), [warehouseId, type, page, pageSize]);
  const { data, loading } = useWarehouseMovements(filters);

  function readWarehouseName(value: unknown) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "name" in value) {
      return (value as { name?: string }).name ?? "-";
    }
    return "-";
  }

  const columns = useMemo(() => [
    { title: "Kho", key: "warehouse", dataIndex: "warehouseId", width: 160, render: (value: unknown) => readWarehouseName(value) },
    {
      title: "Loại", dataIndex: "type", width: 140, render: (value: unknown) => <Tag color={TYPE_LABELS[String(value)]?.color}>{TYPE_LABELS[String(value)]?.label ?? String(value)}</Tag>,
    },
    {
      title: "Mặt hàng", key: "item", render: (_: unknown, row: Record<string, unknown>) => {
        if (row.itemType === "GIFT") return (row.giftId as { name?: string } | null)?.name ?? "Quà tặng";
        const variant = row.variantId as { sku?: string } | null;
        const product = row.productId as { name?: string; code?: string } | null;
        return `${product?.name ?? product?.code ?? "Sản phẩm"} • ${variant?.sku ?? "Không có"}`;
      },
    },
    { title: "Số lượng", dataIndex: "quantity", width: 120, align: "right" as const, render: (value: unknown) => Number(value ?? 0) },
    { title: "Mã tham chiếu", dataIndex: "referenceCode", width: 200, render: (value: unknown) => String(value ?? "-") },
    { title: "Người tạo", dataIndex: "createdBy", width: 180, render: (value: unknown) => ((value as { fullName?: string } | null)?.fullName ?? "-") },
    { title: "Thời gian", dataIndex: "createdAt", width: 180, render: (value: unknown) => new Date(String(value)).toLocaleString("vi-VN") },
  ], []);

  return (
    <PageContainer>
      <PageHeader title="Lịch sử kho" subtitle={`${data?.total ?? 0} movement`} breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Kho", href: "/warehouses" }, { label: "Lịch sử kho" }]} />
      <div className="card">
        <Space style={{ marginBottom: 12 }}>
          <Select allowClear placeholder="Kho" style={{ width: 200 }} value={warehouseId} onChange={(value) => { setWarehouseId(value); setPage(1); }} options={[{ value: "", label: "Tất cả kho" }, ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({ value: w._id, label: w.name }))]} />
          <Select allowClear placeholder="Loại" style={{ width: 180 }} value={type} onChange={(value) => { setType(value); setPage(1); }} options={Object.entries(TYPE_LABELS).map(([value, info]) => ({ value, label: info.label }))} />
        </Space>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={{ current: page, pageSize, total: data?.total ?? 0, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
        />
      </div>
    </PageContainer>
  );
}
