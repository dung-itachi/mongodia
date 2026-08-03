/**
 * SkeletonTable Component (Sprint 3.1 - Complete UI Kit)
 */

import { Skeleton, Table } from "antd";

export type SkeletonTableProps = {
  /** Number of rows to show */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Active animation */
  active?: boolean;
};

export default function SkeletonTable({
  rows = 5,
  columns = 4,
  active = true,
}: SkeletonTableProps) {
  // Generate skeleton columns
  const skeletonColumns = Array.from({ length: columns }, (_, i) => ({
    key: `col-${i}`,
    render: () => <Skeleton active={active} paragraph={{ rows: 1 }} />,
  }));

  // Generate skeleton rows
  const skeletonData = Array.from({ length: rows }, (_, i) => ({
    key: `row-${i}`,
  }));

  return (
    <Table
      columns={skeletonColumns}
      dataSource={skeletonData}
      pagination={false}
    />
  );
}
