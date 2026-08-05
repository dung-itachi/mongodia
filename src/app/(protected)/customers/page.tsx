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
import { Table, Input, Select, Button, Tag, Dropdown, message } from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import PermissionGate from "@/components/common/PermissionGate";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";

import {
  useCustomers,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useDebounce } from "@/hooks/useDebounce";
import type { Customer, CustomerFilter } from "@/types/customer";
import { CustomerStatus } from "@/models/Customer";

const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Hoạt động", value: CustomerStatus.ACTIVE },
  { label: "Không hoạt động", value: CustomerStatus.INACTIVE },
  { label: "Bị chặn", value: CustomerStatus.BLOCKED },
];

export default function CustomersPage() {
  const router = useRouter();

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
      title: "Mã KH",
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
      title: "Tên khách hàng",
      dataIndex: "fullName",
      width: 180,
    },
    {
      key: "phone",
      title: "Số điện thoại",
      dataIndex: "phone",
      width: 130,
    },
    {
      key: "email",
      title: "Email",
      dataIndex: "email",
      width: 180,
      render: (value: string) => value || "-",
    },
    {
      key: "saleEmployee",
      title: "Sale",
      dataIndex: "saleEmployeeId",
      width: 140,
      render: (value: string) => value ? "NV Sale" : "-",
    },
    {
      key: "marketingEmployee",
      title: "Marketing",
      dataIndex: "marketingEmployeeId",
      width: 140,
      render: (value: string) => value ? "NV MKT" : "-",
    },
    {
      key: "status",
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (value: string) => {
        const statusValue = value as CustomerStatus;
        const colorMap: Record<string, string> = {
          [CustomerStatus.ACTIVE]: "green",
          [CustomerStatus.INACTIVE]: "default",
          [CustomerStatus.BLOCKED]: "red",
        };
        const labelMap: Record<string, string> = {
          [CustomerStatus.ACTIVE]: "Hoạt động",
          [CustomerStatus.INACTIVE]: "Không hoạt động",
          [CustomerStatus.BLOCKED]: "Bị chặn",
        };
        return (
          <Tag color={colorMap[statusValue]}>
            {labelMap[statusValue] || statusValue}
          </Tag>
        );
      },
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
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
      title: "Thao tác",
      width: 80,
      fixed: "right" as const,
      render: (_: unknown, record: Customer) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "Xem chi tiết",
                onClick: () => router.push(`/customers/${record._id}`),
              },
              {
                key: "edit",
                icon: <EditOutlined />,
                label: "Chỉnh sửa",
                onClick: () => router.push(`/customers/${record._id}/edit`),
              },
              { type: "divider" as const },
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: "Xóa",
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
  ], [router]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(deleteId);
      message.success("Xóa khách hàng thành công");
      setDeleteId(null);
      refetch();
    } catch (error) {
      message.error((error as Error).message || "Không thể xóa khách hàng");
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
        title="Khách hàng"
        subtitle={`${total} khách hàng`}
        actions={
          <PermissionGate permission="customer.create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Thêm khách hàng
            </Button>
          </PermissionGate>
        }
      />

      <div className="bg-white rounded-lg shadow p-4">
        {/* Search and filters */}
        <div className="mb-4 flex gap-4 flex-wrap">
          <Input.Search
            placeholder="Tìm kiếm theo tên, số điện thoại, email..."
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
            options={STATUS_OPTIONS}
            style={{ width: 180 }}
            placeholder="Chọn trạng thái"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <SkeletonTable columns={columns.length || 8} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="Chưa có khách hàng"
            description="Bắt đầu bằng cách thêm khách hàng mới"
            action={
              <PermissionGate permission="customer.create">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  Thêm khách hàng
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
              showTotal: (t) => `Tổng ${t} khách hàng`,
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
        title="Xóa khách hàng"
        content="Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác."
        type="delete"
        confirmText="Xóa"
        cancelText="Hủy"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageContainer>
  );
}
