"use client";

/**
 * ==================================================
 * INVENTORY MOVEMENTS PAGE
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Trang danh sách Inventory Movements với DataTable + Search + Filter + Pagination.
 */

import { useState, useCallback, useMemo } from "react";
import { Table, Input, Select, Space, Empty, Spin } from "antd";
import type { TableColumnsType } from "antd";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import CardSection from "@/components/common/cards/CardSection";
import SkeletonCard from "@/components/common/overlay/SkeletonCard";

import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS } from "@/configs/inventory.config";

export default function InventoryMovementsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const filters = useMemo(
    () => ({
      page,
      limit,
      search,
      type: typeFilter,
    }),
    [page, limit, search, typeFilter]
  );

  const { movements, total, loading, error, refetch } = useInventoryMovements(filters);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Columns
  const columns: TableColumnsType<{
    _id: string;
    sku: string;
    productName: string;
    quantity: number;
    type: string;
    warehouseId: string;
    orderId: string;
    warehouseTaskId: string;
    note: string | null;
    createdAt: string;
  }> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 140,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
      render: (value: number, record) => {
        const color =
          record.type === "EXPORT" ? "#cf1322" : record.type === "IMPORT" ? "#389e0d" : "#d48806";
        const prefix = record.type === "EXPORT" ? "-" : record.type === "IMPORT" ? "+" : "";
        return (
          <span style={{ color, fontWeight: 600 }}>
            {prefix}
            {value}
          </span>
        );
      },
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (value: string) => (
        <span
          style={{
            color:
              MOVEMENT_TYPE_COLORS[value] === "red"
                ? "#cf1322"
                : MOVEMENT_TYPE_COLORS[value] === "green"
                  ? "#389e0d"
                  : "#d48806",
            fontWeight: 500,
          }}
        >
          {MOVEMENT_TYPE_LABELS[value] || value}
        </span>
      ),
    },
    {
      title: "Order",
      dataIndex: "orderId",
      key: "orderId",
      width: 120,
      render: (value: string) => (
        <span className="font-mono">{value.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      title: "Warehouse Task",
      dataIndex: "warehouseTaskId",
      key: "warehouseTaskId",
      width: 120,
      render: (value: string) => (
        <span className="font-mono">{value.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => formatDate(value),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
  ];

  // Loading state
  if (loading && movements.length === 0) {
    return (
      <PageContainer>
        <SkeletonCard />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Inventory Movements"
        subtitle="Lịch sử xuất/nhập kho"
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Inventory", href: "/inventory/movements" },
        ]}
      />

      <CardSection title="Danh sách movements">
        {/* Filters */}
        <Space style={{ marginBottom: 16 }} size="middle">
          <Input.Search
            placeholder="Tìm SKU, tên sản phẩm..."
            allowClear
            style={{ width: 280 }}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <Select
            placeholder="Loại movement"
            allowClear
            style={{ width: 180 }}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            options={[
              { value: "EXPORT", label: "Xuất kho" },
              { value: "IMPORT", label: "Nhập kho" },
              { value: "ADJUSTMENT", label: "Điều chỉnh" },
            ]}
          />
        </Space>

        {/* Table */}
        {error ? (
          <Empty description={error.message || "Có lỗi xảy ra"} />
        ) : (
          <Table
            dataSource={movements}
            columns={columns}
            loading={loading}
            rowKey="_id"
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} movement`,
              onChange: (newPage, newLimit) => {
                setPage(newPage);
                setLimit(newLimit);
              },
            }}
          />
        )}
      </CardSection>
    </PageContainer>
  );
}