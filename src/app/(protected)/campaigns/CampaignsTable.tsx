/**
 * Campaigns Table Component (Sprint 7.4)
 */

import { memo } from "react";
import { Table, Tag, Button, Space } from "antd";
import type { TablePaginationConfig } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined } from "@ant-design/icons";
import type { Campaign } from "@/hooks/useCampaigns";
import { formatNumber } from "@/lib/format";
import styles from "./campaigns.module.css";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green",
  PAUSED: "orange",
  COMPLETED: "blue",
  ARCHIVED: "default",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Lưu trữ",
};

function getPageName(page: Campaign["facebookPageId"]): string {
  if (!page) return "-";
  if (typeof page === "object" && page !== null) {
    return page.name;
  }
  return "-";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export type CampaignsTableProps = {
  data: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onPageChange: (page: number, pageSize: number) => void;
  onSortChange: (field: string, order: "asc" | "desc" | undefined) => void;
  onEdit: (id: string) => void;
};

function CampaignsTableInner({
  data,
  total,
  page,
  pageSize,
  sortField,
  sortOrder,
  onPageChange,
  onSortChange,
  onEdit,
}: CampaignsTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTableChange = (pagination: TablePaginationConfig, _filters: any, sorter: any) => {
    onPageChange(pagination.current ?? 1, pagination.pageSize ?? 20);
    if (sorter?.field && sorter?.order) {
      const order = sorter.order === "ascend" ? "asc" : "desc";
      onSortChange(String(sorter.field), order);
    } else {
      onSortChange(sortField ?? "", undefined);
    }
  };

  const columns: ColumnsType<Campaign> = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: true,
      sortOrder: sortField === "code" ? (sortOrder === "asc" ? "ascend" : "descend") as "ascend" | "descend" : undefined,
    },
    {
      title: "Tên Campaign",
      dataIndex: "name",
      key: "name",
      width: 200,
      sorter: true,
      sortOrder: sortField === "name" ? (sortOrder === "asc" ? "ascend" : "descend") as "ascend" | "descend" : undefined,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: "Facebook Page",
      key: "facebookPageId",
      width: 150,
      render: (_: unknown, record: Campaign) => getPageName(record.facebookPageId),
    },
    {
      title: "Objective",
      dataIndex: "objective",
      key: "objective",
      width: 120,
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
      render: (date: string | null) => formatDate(date),
    },
    {
      title: "Daily Budget",
      dataIndex: "dailyBudget",
      key: "dailyBudget",
      width: 120,
      align: "right",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED") => (
        <Tag color={STATUS_COLORS[status]}>
          {STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      fixed: "right",
      render: (_: unknown, record: Campaign) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record._id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="_id"
      onChange={handleTableChange}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (t: number) => `Tổng: ${t}`,
      }}
      scroll={{ x: 1200 }}
      size="middle"
    />
  );
}

const CampaignsTable = memo(CampaignsTableInner);
export default CampaignsTable;
