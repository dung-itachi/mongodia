/**
 * Pagination Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design Pagination.
 */

import { Pagination } from "antd";
import type { PaginationProps as AntPaginationProps } from "antd";
import type { ReactNode } from "react";

export type PaginationProps = {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: string[];
  showTotal?: (total: number) => ReactNode;
};

export default function PaginationComponent({
  current,
  pageSize,
  total,
  onChange,
  showSizeChanger = true,
  showQuickJumper = true,
  pageSizeOptions = ["10", "20", "50", "100"],
  showTotal,
}: PaginationProps) {
  const handleChange: AntPaginationProps["onShowSizeChange"] = (
    page,
    size
  ) => {
    onChange(page, size);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 16,
      }}
    >
      <Pagination
        current={current}
        pageSize={pageSize}
        total={total}
        onChange={handleChange}
        showSizeChanger={showSizeChanger}
        showQuickJumper={showQuickJumper}
        pageSizeOptions={pageSizeOptions}
        showTotal={
          showTotal ||
          ((total: number) => `Tổng: ${total}`)
        }
      />
    </div>
  );
}
