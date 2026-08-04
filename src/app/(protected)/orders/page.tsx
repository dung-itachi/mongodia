"use client";

/**
 * Orders Page (Sprint 6.0 — Order Module Foundation)
 *
 * Main page for order management with search, filter, and table display.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { message, Dropdown } from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import DataTable from "@/components/common/table/DataTable";
import TableToolbar from "@/components/common/table/TableToolbar";
import FilterBar from "@/components/common/filters/FilterBar";
import StatusBadge from "@/components/common/display/StatusBadge";
import ActionButton from "@/components/common/buttons/ActionButton";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import PermissionGate from "@/components/common/PermissionGate";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";

import { useOrders, useDeleteOrder } from "@/hooks/useOrders";
import { useDebounce } from "@/hooks/useDebounce";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import type { OrderStatus } from "@/constants/orderStatus";
import type { OrderListItem } from "@/types/order";

export default function OrdersPage() {
  const router = useRouter();

  // Search and filter state
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Build filter params
  const filterParams = useMemo(() => ({
    keyword: debouncedKeyword,
    status: status as OrderStatus | undefined,
    dateFrom: dateRange?.[0],
    dateTo: dateRange?.[1],
    page,
    limit: pageSize,
  }), [debouncedKeyword, status, dateRange, page, pageSize]);

  // Fetch orders
  const { orders, total, loading, refetch } = useOrders(filterParams);

  // Delete mutation
  const deleteMutation = useDeleteOrder();

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    if (values.status !== undefined) {
      setStatus(values.status === "" ? undefined : values.status as string);
    }
    if (values.dateRange !== undefined) {
      setDateRange(values.dateRange as [string, string] | undefined);
    }
    setPage(1);
  }, []);

  // Table columns
  const columns = useMemo(() => [
    {
      key: "orderCode",
      title: "Mã đơn",
      dataIndex: "orderCode",
      width: 140,
      render: (value: unknown) => (
        <a onClick={() => {
          const order = orders.find(o => o.orderCode === value);
          if (order) router.push(`/orders/${order._id}`);
        }}>
          {String(value)}
        </a>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      dataIndex: "customerName",
      width: 180,
      render: (value: unknown, record: Record<string, unknown>) => (
        <div>
          <div>{String(value)}</div>
          {record.customerPhone ? (
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {String(record.customerPhone)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "saleEmployee",
      title: "Sale",
      dataIndex: "saleEmployee",
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => {
        const sale = record.saleEmployee as { fullName: string; employeeCode: string } | undefined;
        if (!sale) return <span>-</span>;
        return (
          <div>
            <div>{sale.fullName}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {sale.employeeCode}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      render: (value: unknown) => (
        <StatusBadge status={String(value)} />
      ),
    },
    {
      key: "totalAmount",
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      width: 140,
      align: "right" as const,
      render: (value: unknown, record: Record<string, unknown>) => {
        const formatter = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: (record.currency as string) || "VND",
          maximumFractionDigits: 0,
        });
        return <span style={{ fontWeight: 500 }}>{formatter.format(Number(value))}</span>;
      },
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 120,
      render: (value: unknown) => {
        const date = new Date(String(value));
        return date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      },
    },
    {
      key: "actions",
      title: "Thao tác",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "view",
                  icon: <EyeOutlined />,
                  label: "Xem chi tiết",
                  onClick: () => router.push(`/orders/${order._id}`),
                },
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "Sửa",
                  disabled: order.status === "DELIVERED" || order.status === "CANCELLED",
                  onClick: () => router.push(`/orders/${order._id}?mode=edit`),
                },
                { type: "divider" },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "Xóa",
                  danger: true,
                  disabled: order.status === "DELIVERED",
                  onClick: () => setDeleteId(order._id),
                },
              ],
            }}
          >
            <ActionButton
              type="ghost"
              icon={<MoreOutlined />}
              size="small"
            />
          </Dropdown>
        );
      },
    },
  ], [router, orders]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(deleteId);
      message.success("Xóa đơn hàng thành công");
      setDeleteId(null);
      void refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Xóa đơn hàng thất bại");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteId, deleteMutation, refetch]);

  // Pagination config
  const pagination = useMemo(() => ({
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (totalCount: number) => `Tổng: ${totalCount}`,
    onChange: (newPage: number, newPageSize: number) => {
      setPage(newPage);
      setPageSize(newPageSize);
    },
  }), [page, pageSize, total]);

  // Custom filter items for FilterBar
  const customFilterItems = useMemo(() => [
    {
      key: "status",
      type: "select" as const,
      label: "Trạng thái",
      options: [
        { value: "", label: "Tất cả trạng thái" },
        ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      ],
    },
    {
      key: "dateRange",
      type: "dateRange" as const,
      label: "Ngày tạo",
    },
  ], []);

  const filterValues = useMemo(() => ({
    status: status ?? "",
    dateRange,
  }), [status, dateRange]);

  return (
    <PageContainer>
      <PageHeader
        title="Đơn hàng"
        subtitle={`${total} đơn hàng`}
        breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Đơn hàng" },
        ]}
        actions={
          <PermissionGate permission="order.create">
            <ActionButton
              type="primary"
              icon={<PlusOutlined />}
              label="Tạo đơn"
              onClick={() => router.push("/orders/new")}
            />
          </PermissionGate>
        }
      />

      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm mã đơn, tên khách hàng..."
          onRefresh={() => void refetch()}
          loading={loading}
          actions={
            <PermissionGate permission="order.create">
              <ActionButton
                type="primary"
                icon={<PlusOutlined />}
                label="Tạo đơn"
                onClick={() => router.push("/orders/new")}
              />
            </PermissionGate>
          }
        />

        <FilterBar
          items={customFilterItems}
          values={filterValues}
          onChange={handleFilterChange}
        />

        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Chưa có đơn hàng"
            description={
              debouncedKeyword || status || dateRange
                ? "Không tìm thấy đơn hàng nào phù hợp với bộ lọc"
                : "Bắt đầu bằng cách tạo đơn hàng mới"
            }
            action={
              <PermissionGate permission="order.create">
                <ActionButton
                  type="primary"
                  icon={<PlusOutlined />}
                  label="Tạo đơn"
                  onClick={() => router.push("/orders/new")}
                />
              </PermissionGate>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={orders as unknown as Record<string, unknown>[]}
            loading={loading}
            pagination={pagination}
            rowKey="_id"
            scroll={{ x: 1000 }}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Xóa đơn hàng"
        content="Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác."
        type="delete"
        confirmText="Xóa"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageContainer>
  );
}
