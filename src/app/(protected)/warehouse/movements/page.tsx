"use client";

import { useState, useMemo, useCallback } from "react";
import { Select, Space, DatePicker, Input } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import { Table, Tag } from "antd";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseMovements } from "@/hooks/useWarehouseWorkflow";
import WarehouseQuickPick from "@/components/warehouse/WarehouseQuickPick";
import type { WarehouseStockMovementItem } from "@/types/warehouse-history";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS, REFERENCE_TYPE_LABELS } from "@/types/warehouse-history";
import type { WarehouseStockMovementType } from "@/models/WarehouseStockMovement";

const { RangePicker } = DatePicker;

const TYPE_LABELS: Record<WarehouseStockMovementType, { label: string; color: string }> = {
  IMPORT: { label: "Nhập", color: "green" },
  TRANSFER_OUT: { label: "Chuyển đi", color: "orange" },
  TRANSFER_IN: { label: "Nhận chuyển", color: "blue" },
  ORDER_OUT: { label: "Xuất đơn", color: "volcano" },
  ORDER_RETURN: { label: "Hoàn đơn", color: "purple" },
  ADJUSTMENT: { label: "Điều chỉnh", color: "magenta" },
};

// Movement types that indicate stock going OUT (negative impact on inventory)
const OUT_TYPES: WarehouseStockMovementType[] = ["TRANSFER_OUT", "ORDER_OUT"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQuantity(quantity: number, movementType: WarehouseStockMovementType): { display: string; color: string } {
  // Stock OUT types should show negative
  if (OUT_TYPES.includes(movementType)) {
    return { display: `-${quantity}`, color: "#cf1322" }; // red
  }
  // IMPORT, TRANSFER_IN, ORDER_RETURN are stock IN
  return { display: `+${quantity}`, color: "#389e0d" }; // green
}

export default function WarehouseMovementsPage() {
  const { warehouses } = useWarehouses();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const filters = useMemo(() => ({
    warehouseId,
    type,
    startDate: dateRange?.[0]?.isValid() ? dateRange[0].format("YYYY-MM-DD") : undefined,
    endDate: dateRange?.[1]?.isValid() ? dateRange[1].format("YYYY-MM-DD") : undefined,
    search: search || undefined,
    page,
    limit: pageSize,
  }), [warehouseId, type, dateRange, search, page, pageSize]);

  const { data, loading } = useWarehouseMovements(filters);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: TableColumnsType<WarehouseStockMovementItem> = useMemo(() => [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => formatDate(value),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Kho",
      dataIndex: ["warehouseId", "name"],
      key: "warehouse",
      width: 150,
      render: (_, record) => record.warehouseId?.name ?? "-",
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 130,
      render: (value: string) => (
        <Tag color={TYPE_LABELS[value as WarehouseStockMovementType]?.color}>
          {TYPE_LABELS[value as WarehouseStockMovementType]?.label ?? value}
        </Tag>
      ),
    },
    {
      title: "Sản phẩm / Quà tặng",
      key: "item",
      width: 220,
      render: (_, record) => {
        if (record.itemType === "GIFT") {
          return (
            <div>
              <div style={{ fontWeight: 500 }}>🎁 {record.giftId?.name ?? "Quà tặng"}</div>
            </div>
          );
        }
        const product = record.productId;
        const variant = record.variantId;
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{product?.name ?? product?.code ?? "Sản phẩm"}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              SKU: {variant?.sku ?? "Không có"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right" as const,
      render: (value: number, record) => {
        const { display, color } = formatQuantity(value, record.type);
        return <span style={{ fontWeight: 600, color }}>{display}</span>;
      },
    },
    {
      title: "Mã tham chiếu",
      dataIndex: "referenceCode",
      key: "referenceCode",
      width: 180,
      render: (value: string, record) => (
        <div>
          <div className="font-mono" style={{ fontSize: 13 }}>{value || "-"}</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            {record.referenceType && REFERENCE_TYPE_LABELS[record.referenceType]}
          </div>
        </div>
      ),
    },
    {
      title: "Người thực hiện",
      dataIndex: ["createdBy", "fullName"],
      key: "createdBy",
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.createdBy?.fullName ?? "-"}</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            {record.createdBy?.employeeCode}
          </div>
        </div>
      ),
    },
  ], []);

  return (
    <PageContainer>
      <PageHeader
        title="Lịch sử kho"
        subtitle={`${data?.total ?? 0} movement`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Kho", href: "/warehouses" },
          { label: "Lịch sử kho" },
        ]}
      />
      <div className="card">
        <WarehouseQuickPick
          value={warehouseId}
          onChange={(next) => {
            setWarehouseId(next);
            setPage(1);
          }}
          warehouses={warehouses}
        />
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Input.Search
            placeholder="Tìm sản phẩm, SKU, mã tham chiếu..."
            allowClear
            style={{ width: 280 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
          />
          <Select
            allowClear
            placeholder="Kho"
            style={{ width: 180 }}
            value={warehouseId}
            onChange={(value) => {
              setWarehouseId(value);
              setPage(1);
            }}
            options={[
              { value: "", label: "Tất cả kho" },
              ...(warehouses ?? []).map((w: { _id: string; name: string }) => ({
                value: w._id,
                label: w.name,
              })),
            ]}
          />
          <Select
            allowClear
            placeholder="Loại movement"
            style={{ width: 160 }}
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
            options={Object.entries(TYPE_LABELS).map(([value, info]) => ({
              value,
              label: info.label,
            }))}
          />
          <RangePicker
            style={{ width: 260 }}
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
              setPage(1);
            }}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            allowClear
          />
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} movement`,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </div>
    </PageContainer>
  );
}
