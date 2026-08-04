"use client";

/**
 * ==================================================
 * INVENTORY SECTION
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Hiển thị danh sách movements cho warehouse task.
 */

import { useState, useCallback } from "react";
import { Table, Empty, Spin } from "antd";
import type { TableColumnsType } from "antd";

import CardSection from "@/components/common/cards/CardSection";
import { useTaskInventoryMovements } from "@/hooks/useInventoryMovements";
import { MOVEMENT_TYPE_COLORS, MOVEMENT_TYPE_LABELS } from "@/configs/inventory.config";

interface InventorySectionProps {
  taskId: string;
}

export default function InventorySection({ taskId }: InventorySectionProps) {
  const { movements, loading } = useTaskInventoryMovements(taskId);

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
      title: "SL xuất",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
      render: (value: number) => (
        <span className="font-semibold text-red-600">-{value}</span>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (value: string) => (
        <span
          style={{
            color: MOVEMENT_TYPE_COLORS[value] === "red" ? "#cf1322" : "#389e0d",
            fontWeight: 500,
          }}
        >
          {MOVEMENT_TYPE_LABELS[value] || value}
        </span>
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

  return (
    <CardSection title="Inventory Movements">
      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : movements.length === 0 ? (
        <Empty description="Chưa có movement nào" />
      ) : (
        <Table
          dataSource={movements}
          columns={columns}
          pagination={false}
          size="small"
          rowKey="_id"
        />
      )}
    </CardSection>
  );
}