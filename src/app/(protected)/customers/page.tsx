"use client";

/**
 * ==================================================
 * CUSTOMER LIST PAGE
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Main page for customer management with search, filter,
 * pagination, and table display.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, Input, Select, Button, Tag, Dropdown } from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  UserOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import PermissionGate from "@/components/common/PermissionGate";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";
import { PageStatsBanner } from "@/components/common";
import { useMessage } from "@/contexts/MessageContext";

import {
  useCustomers,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import type { Customer, CustomerFilter } from "@/types/customer";
import { CustomerStatus } from "@/types/customer";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const STATUS_LABEL_KEYS: Record<string, string> = {
  [CustomerStatus.ACTIVE]: "Hoạt động",
  [CustomerStatus.INACTIVE]: "Không hoạt động",
  [CustomerStatus.BLOCKED]: "Bị chặn",
};

function CustomerStatusLabel({ value }: { value: string }) {
  const lang = useLanguageStore((s) => s.language);
  const statusValue = value as CustomerStatus;
  const colorMap: Record<string, string> = {
    [CustomerStatus.ACTIVE]: "green",
    [CustomerStatus.INACTIVE]: "default",
    [CustomerStatus.BLOCKED]: "red",
  };
  return (
    <Tag color={colorMap[statusValue]}>
      {t(STATUS_LABEL_KEYS[statusValue] || statusValue, lang)}
    </Tag>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);

  const statusOptions = useMemo(
    () => [
      { label: t("Tất cả trạng thái", lang), value: "" },
      { label: t("Hoạt động", lang), value: CustomerStatus.ACTIVE },
      { label: t("Không hoạt động", lang), value: CustomerStatus.INACTIVE },
      { label: t("Bị chặn", lang), value: CustomerStatus.BLOCKED },
    ],
    [lang]
  );

  // Search and filter state
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Build filter params
  const filterParams = useMemo((): CustomerFilter => ({
    keyword: debouncedKeyword,
    status: status ? status as CustomerStatus : undefined,
    page,
    pageSize,
  }), [debouncedKeyword, status, page, pageSize]);

  // Fetch customers
  const { data, isLoading, refetch } = useCustomers(filterParams);
  const customers = data?.items ?? [];
  const total = data?.total ?? 0;

  // Calculate customer stats
  const customerStats = useMemo(() => {
    const active = customers.filter((c) => c.status === CustomerStatus.ACTIVE).length;
    const inactive = customers.filter((c) => c.status === CustomerStatus.INACTIVE).length;
    const blocked = customers.filter((c) => c.status === CustomerStatus.BLOCKED).length;
    return { total, active, inactive, blocked };
  }, [customers, total]);

  // Delete mutation
  const deleteMutation = useDeleteCustomer();

  const handleFilterChange = useCallback((value: string, field: string) => {
    if (field === "status") {
      setStatus(value);
    }
    setPage(1);
  }, []);

  // Table columns
  const columns: TableProps<Customer>["columns"] = useMemo(() => [
    {
      key: "customerCode",
      title: t("Mã KH", lang),
      dataIndex: "customerCode",
      width: 120,
      render: (value: string, record: Customer) => (
        <a onClick={() => router.push(`/customers/${record._id}`)}>
          {value}
        </a>
      ),
    },
    {
      key: "fullName",
      title: t("Tên khách hàng", lang),
      dataIndex: "fullName",
      width: 180,
    },
    {
      key: "phone",
      title: t("Số điện thoại", lang),
      dataIndex: "phone",
      width: 130,
    },
    {
      key: "email",
      title: t("Email", lang),
      dataIndex: "email",
      width: 180,
      render: (value: string) => value || "-",
    },
    {
      key: "saleEmployee",
      title: t("Sale", lang),
      dataIndex: "saleEmployeeId",
      width: 140,
      render: (value: string) => value ? t("NV Sale", lang) : "-",
    },
    {
      key: "marketingEmployee",
      title: t("Marketing", lang),
      dataIndex: "marketingEmployeeId",
      width: 140,
      render: (value: string) => value ? t("NV MKT", lang) : "-",
    },
    {
      key: "status",
      title: t("Trạng thái", lang),
      dataIndex: "status",
      width: 120,
      render: (value: string) => <CustomerStatusLabel value={value} />,
    },
    {
      key: "createdAt",
      title: t("Ngày tạo", lang),
      dataIndex: "createdAt",
      width: 120,
      render: (value: string) => {
        if (!value) return "-";
        const date = new Date(value);
        return date.toLocaleDateString("vi-VN");
      },
    },
    {
      key: "actions",
      title: t("Thao tác", lang),
      width: 80,
      fixed: "right" as const,
      render: (_: unknown, record: Customer) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "view",
                icon: <EyeOutlined />,
                label: t("Xem chi tiết", lang),
                onClick: () => router.push(`/customers/${record._id}`),
              },
              {
                key: "edit",
                icon: <EditOutlined />,
                label: t("Chỉnh sửa", lang),
                onClick: () => router.push(`/customers/${record._id}/edit`),
              },
              { type: "divider" as const },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: t("Xóa", lang),
                danger: true,
                onClick: () => setDeleteId(record._id),
              },
            ],
          }}
          trigger={["click"]}
        >
          <button className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      ),
    },
  ], [router, lang]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(deleteId);
      message.success(t("Xóa khách hàng thành công", lang));
      setDeleteId(null);
      refetch();
    } catch (error) {
      message.error((error as Error).message || t("Không thể xóa khách hàng", lang));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreate = () => {
    router.push("/customers/new");
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("Khách hàng", lang)}
        subtitle={`${total} ${t("khách hàng", lang)}`}
        actions={
          <PermissionGate permission="customer.create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t("Thêm khách hàng", lang)}
            </Button>
          </PermissionGate>
        }
      />

      {/* Stats Banner */}
      <PageStatsBanner
        stats={[
          {
            key: "total",
            value: customerStats.total,
            label: t("Tổng khách hàng", lang),
            icon: <TeamOutlined style={{ color: "#1890ff" }} />,
            color: "blue",
          },
          {
            key: "active",
            value: customerStats.active,
            label: t("Đang hoạt động", lang),
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            color: "green",
          },
          {
            key: "inactive",
            value: customerStats.inactive,
            label: t("Không hoạt động", lang),
            icon: <UserOutlined style={{ color: "#fa8c16" }} />,
            color: "orange",
          },
          {
            key: "blocked",
            value: customerStats.blocked,
            label: t("Bị chặn", lang),
            icon: <StopOutlined style={{ color: "#ff4d4f" }} />,
            color: "red",
          },
        ]}
        loading={isLoading}
        style={{ marginBottom: 16 }}
      />

      <div className="bg-white rounded-lg shadow p-4">
        {/* Search and filters */}
        <div className="mb-4 flex gap-4 flex-wrap">
          <Input.Search
            placeholder={t("Tìm kiếm theo tên, số điện thoại, email...", lang)}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={status}
            onChange={(value) => handleFilterChange(value, "status")}
            options={statusOptions}
            style={{ width: 180 }}
            placeholder={t("Chọn trạng thái", lang)}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <SkeletonTable columns={columns.length || 8} />
        ) : customers.length === 0 ? (
          <EmptyState
            title={t("Chưa có khách hàng", lang)}
            description={t("Bắt đầu bằng cách thêm khách hàng mới", lang)}
            action={
              <PermissionGate permission="customer.create">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  {t("Thêm khách hàng", lang)}
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={customers}
            loading={isLoading}
            rowKey="_id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `${t("Tổng", lang)} ${total} ${t("khách hàng", lang)}`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            scroll={{ x: 1200 }}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title={t("Xóa khách hàng", lang)}
        content={t("Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác.", lang)}
        type="delete"
        confirmText={t("Xóa", lang)}
        cancelText={t("Hủy", lang)}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageContainer>
  );
}
