/**
 * DataTable Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Table with standardized settings.
 */

import { Table, Empty } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { ReactNode } from "react";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

/**
 * Get translated text synchronously (for default props)
 */
function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export type Column = {
  key: string;
  title: ReactNode;
  dataIndex?: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right";
  hidden?: boolean;
  render?: (value: unknown, record: Record<string, unknown>, index?: number) => ReactNode;
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
  onRow?: TableProps<Record<string, unknown>>["onRow"];
};

export default function DataTable({
  columns,
  data,
  loading,
  pagination,
  rowKey = "id",
  onChange,
  rowSelection,
  emptyText,
  scroll,
  size = "middle",
  onRow,
}: DataTableProps) {
  // Default pagination config
  const defaultPagination: TablePaginationConfig | false =
    pagination === false
      ? false
      : pagination || {
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total: number) => `${getTranslated("Tổng: ${total}").replace("${total}", String(total))}`,
        };

  // Filter out hidden columns
  const visibleColumns = columns.filter((col) => !col.hidden);

  return (
    <Table<Record<string, unknown>>
      columns={visibleColumns}
      dataSource={data}
      loading={loading}
      pagination={defaultPagination}
      rowKey={rowKey}
      onChange={onChange}
      rowSelection={rowSelection}
      scroll={scroll}
      size={size}
      onRow={onRow}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyText ?? getTranslated("Không có dữ liệu")}
          />
        ),
      }}
    />
  );
}
