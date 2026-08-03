/**
 * DataTable Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Table with standardized settings.
 */

import { Table, Empty } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { ReactNode } from "react";

export type Column = {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, record: Record<string, unknown>, index: number) => ReactNode;
};

export type DataTableProps = {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  rowKey?: string | ((record: Record<string, unknown>) => string);
  onChange?: TableProps<Record<string, unknown>>["onChange"];
  rowSelection?: TableProps<Record<string, unknown>>["rowSelection"];
  emptyText?: string;
  scroll?: { x?: number | string; y?: number | string };
  size?: "small" | "middle" | "large";
};

export default function DataTable({
  columns,
  data,
  loading,
  pagination,
  rowKey = "id",
  onChange,
  rowSelection,
  emptyText = "Không có dữ liệu",
  scroll,
  size = "middle",
}: DataTableProps) {
  // Default pagination config
  const defaultPagination: TablePaginationConfig | false =
    pagination === false
      ? false
      : pagination || {
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total: number) => `Tổng: ${total}`,
        };

  return (
    <Table<Record<string, unknown>>
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={defaultPagination}
      rowKey={rowKey}
      onChange={onChange}
      rowSelection={rowSelection}
      scroll={scroll}
      size={size}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyText}
          />
        ),
      }}
    />
  );
}
