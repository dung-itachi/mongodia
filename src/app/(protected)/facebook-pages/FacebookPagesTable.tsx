/**
 * Facebook Pages Table Component (Sprint 7.4)
 */

import { memo } from "react";
import { Table, Tag, Button, Space, Switch, Tooltip, Image } from "antd";
import type { TablePaginationConfig } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import type { FacebookPage } from "@/hooks/useFacebookPages";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./facebook-pages.module.css";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green",
  INACTIVE: "default",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Không hoạt động",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

function MarketingEmployeeCell({ record }: { record: FacebookPage }) {
  const lang = useLanguageStore((s) => s.language);
  const assignment = record.currentAssignment;
  const employee = assignment?.marketingEmployee;

  if (!assignment || !employee) {
    return <span style={{ color: "#999" }}>{t("Chưa phân công", lang)}</span>;
  }

  const tooltipContent = (
    <div style={{ lineHeight: 1.6 }}>
      <div>
        <strong>{employee.employeeCode}</strong> - {employee.fullName}
      </div>
      <div>{t("Bắt đầu:", lang)} {formatDate(assignment.startDate)}</div>
      <div>
        {t("Kết thúc:", lang)}{" "}
        {assignment.endDate ? formatDate(assignment.endDate) : t("Hiện tại", lang)}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="topLeft">
      <Space size={6}>
        <UserOutlined style={{ color: "#1677ff" }} />
        <span style={{ fontWeight: 500 }}>{employee.fullName}</span>
      </Space>
    </Tooltip>
  );
}

export type FacebookPagesTableProps = {
  data: FacebookPage[];
  total: number;
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onPageChange: (page: number, pageSize: number) => void;
  onSortChange: (field: string, order: "asc" | "desc" | undefined) => void;
  onEdit: (id: string) => void;
  onToggleActive?: (page: FacebookPage, checked: boolean) => void;
};

function FacebookPagesTableInner({
  data,
  total,
  page,
  pageSize,
  sortField,
  sortOrder,
  onPageChange,
  onSortChange,
  onEdit,
  onToggleActive,
}: FacebookPagesTableProps) {
  const lang = useLanguageStore((s) => s.language);

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

  const columns: ColumnsType<FacebookPage> = [
    {
      title: "",
      key: "avatar",
      width: 60,
      render: (_: unknown, record: FacebookPage) => record.avatarUrl ? (
        <Image
          src={record.avatarUrl}
          alt={record.name}
          width={40}
          height={40}
          style={{ borderRadius: 8, objectFit: "cover" }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        />
      ) : (
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#999"
        }}>
          FB
        </div>
      ),
    },
    {
      title: t("Mã", lang),
      dataIndex: "code",
      key: "code",
      width: 120,
      sorter: true,
      sortOrder: sortField === "code" ? (sortOrder === "asc" ? "ascend" : "descend") as "ascend" | "descend" : undefined,
    },
    {
      title: t("Tên Page", lang),
      dataIndex: "name",
      key: "name",
      width: 200,
      sorter: true,
      sortOrder: sortField === "name" ? (sortOrder === "asc" ? "ascend" : "descend") as "ascend" | "descend" : undefined,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: t("URL", lang),
      dataIndex: "pageUrl",
      key: "pageUrl",
      width: 200,
      ellipsis: true,
      render: (url: string) => url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      ) : "-",
    },
    {
      title: t("Facebook ID", lang),
      dataIndex: "facebookPageId",
      key: "facebookPageId",
      width: 150,
      ellipsis: true,
    },
    {
      title: t("Trạng thái", lang),
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: "ACTIVE" | "INACTIVE") => (
        <Tag color={STATUS_COLORS[status]}>
          {t(STATUS_LABEL_KEY[status] ?? status, lang)}
        </Tag>
      ),
    },
    {
      title: t("MKT phụ trách", lang),
      key: "marketingEmployee",
      width: 200,
      render: (_: unknown, record: FacebookPage) => <MarketingEmployeeCell record={record} />,
    },
    {
      title: t("Mô tả", lang),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      minWidth: 260,
    },
    {
      title: t("Thao tác", lang),
      key: "active",
      width: 100,
      align: "center",
      render: (_: unknown, record: FacebookPage) => (
        <Switch
          checked={record.status === "ACTIVE"}
          onChange={(checked) => onToggleActive?.(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      fixed: "right",
      render: (_: unknown, record: FacebookPage) => (
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
        showTotal: (total: number) => `${t("Tổng:", lang)} ${total}`,
      }}
      scroll={{ x: "max-content" }}
      tableLayout="auto"
      size="middle"
    />
  );
}

const FacebookPagesTable = memo(FacebookPagesTableInner);
export default FacebookPagesTable;