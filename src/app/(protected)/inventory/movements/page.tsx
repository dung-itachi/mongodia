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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


export default function InventoryMovementsPage() {
  const lang = useLanguageStore((s) => s.language);
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
      title: t("SKU", lang),
      dataIndex: "sku",
      key: "sku",
      width: 140,
    },
    {
      title: t("Tên sản phẩm", lang),
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    {
      title: t("Số lượng", lang),
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
      title: t("Loại", lang),
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
          {t(MOVEMENT_TYPE_LABELS[value] || value, lang)}
        </span>
      ),
    },
    {
      title: t("Order", lang),
      dataIndex: "orderId",
      key: "orderId",
      width: 120,
      render: (value: string) => (
        <span className="font-mono">{value.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      title: t("Warehouse Task", lang),
      dataIndex: "warehouseTaskId",
      key: "warehouseTaskId",
      width: 120,
      render: (value: string) => (
        <span className="font-mono">{value.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      title: t("Thời gian", lang),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (value: string) => formatDate(value),
    },
    {
      title: t("Ghi chú", lang),
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
      <PageHeader title={t("Inventory Movements", lang)} subtitle={t("Lịch sử xuất/nhập kho", lang)}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Inventory", lang), href: "/inventory/movements" },
        ]}
      />

      <CardSection title={t("Danh sách movements", lang)}>
        {/* Filters */}
        <Space style={{ marginBottom: 16 }} size="middle">
          <Input.Search
            placeholder={t("Tìm SKU, tên sản phẩm...", lang)}
            allowClear
            style={{ width: 280 }}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <Select
            placeholder={t("Loại movement", lang)}
            allowClear
            style={{ width: 180 }}
            onChange={(value) => {
              setTypeFilter(value);
              setPage(1);
            }}
            options={[
              { value: "EXPORT", label: t("Xuất kho", lang) },
              { value: "IMPORT", label: t("Nhập kho", lang) },
              { value: "ADJUSTMENT", label: t("Điều chỉnh", lang) },
            ]}
          />
        </Space>

        {/* Table */}
        {error ? (
          <Empty description={error.message || t("Có lỗi xảy ra", lang)} />
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
              showTotal: (total) => `${t("Tổng", lang)} ${total} movement`,
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