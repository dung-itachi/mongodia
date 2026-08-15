"use client";

/**
 * Orders Page (Sprint 6.0 — Order Module Foundation)
 *
 * Main page for order management with search, filter, and table display.
 *
 * Filter theo status từ URL: /orders?status=SHIPPING
 * Nếu không có status → hiển thị tất cả.
 */

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { message, Dropdown, Button, Space } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  StopOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import DataTable from "@/components/common/table/DataTable";
import TableToolbar from "@/components/common/table/TableToolbar";
import FilterBar from "@/components/common/filters/FilterBar";
import StatusBadge from "@/components/common/display/StatusBadge";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";

import { useOrders, useDeleteOrder, useChangeOrderStatus } from "@/hooks/useOrders";
import { useDebounce } from "@/hooks/useDebounce";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import type { OrderStatus } from "@/constants/orderStatus";
import { STATUS_ACTIONS } from "@/configs/order-status.config";
import type { OrderListItem } from "@/types/order";

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read status từ URL (?status=SHIPPING, ?status=DELIVERED, ...)
  const urlStatus = searchParams.get("status")?.toUpperCase() ?? undefined;

  // Search and filter state
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  const [status, setStatus] = useState<string | undefined>(urlStatus);
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Đồng bộ status khi URL thay đổi (user click sidebar link khác)
  useEffect(() => {
    setStatus(urlStatus);
    setPage(1); // reset page khi đổi filter
  }, [urlStatus]);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Quick action state (for ?status=CONFIRMED)
  const [quickActionTarget, setQuickActionTarget] = useState<{
    order: OrderListItem;
    targetStatus: string;
    label: string;
  } | null>(null);
  const [quickActionLoading, setQuickActionLoading] = useState(false);

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

  // Status change mutation
  const changeStatusMutation = useChangeOrderStatus();

  // Show quick action buttons only for CONFIRMED status
  const showQuickActions = status === "CONFIRMED";

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    if (values.status !== undefined) {
      setStatus(values.status === "" ? undefined : values.status as string);
    }
    if (values.dateRange !== undefined) {
      setDateRange(values.dateRange as [string, string] | undefined);
    }
    setPage(1);
  }, []);

  const getOrderItemTotals = useCallback((order: OrderListItem) => {
    const items = order.orderItems ?? [];
    return {
      comboName: items.map((item) => item.comboName || item.productName).filter(Boolean).join(", ") || order.combo?.name || order.product?.name || "-",
      comboQuantity: items.reduce((sum, item) => sum + (item.comboQuantity ?? item.quantity ?? 0), 0) || order.quantity,
      productQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.packageQuantity, 0),
      giftQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.giftQuantity, 0),
    };
  }, []);

  // Handle quick status change (open confirm dialog)
  const handleQuickAction = useCallback(
    (order: OrderListItem, targetStatus: string, label: string) => {
      setQuickActionTarget({ order, targetStatus, label });
    },
    []
  );

  // Confirm quick status change
  const handleConfirmQuickAction = useCallback(async () => {
    if (!quickActionTarget) return;

    setQuickActionLoading(true);
    try {
      await changeStatusMutation.mutateAsync({
        id: quickActionTarget.order._id,
        data: { status: quickActionTarget.targetStatus },
      });
      const targetLabel =
        ORDER_STATUS_LABELS[quickActionTarget.targetStatus as OrderStatus] ??
        quickActionTarget.targetStatus;
      message.success(`Đã chuyển đơn sang "${targetLabel}"`);
      setQuickActionTarget(null);
      void refetch();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Chuyển trạng thái thất bại"
      );
    } finally {
      setQuickActionLoading(false);
    }
  }, [quickActionTarget, changeStatusMutation, refetch]);

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
      key: "combo",
      title: "Combo",
      width: 200,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).comboName,
    },
    {
      key: "product",
      title: "Sản phẩm",
      width: 180,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const productName = order.product?.name;
        if (productName) {
          return <span>{productName}</span>;
        }
        return <span style={{ color: "#bfbfbf" }}>-</span>;
      },
    },
    {
      key: "comboProduct",
      title: "Combo sản phẩm",
      width: 180,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const comboName = order.combo?.name;
        if (comboName) {
          return <span>{comboName}</span>;
        }
        return <span style={{ color: "#bfbfbf" }}>-</span>;
      },
    },
    {
      key: "comboQuantity",
      title: "SL combo",
      width: 95,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).comboQuantity,
    },
    {
      key: "totalProducts",
      title: "Tổng SP",
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).productQuantity || "-",
    },
    {
      key: "totalGifts",
      title: "Tổng quà",
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).giftQuantity || "-",
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
      width: showQuickActions ? 280 : 100,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;

        // Khi filter theo status=CONFIRMED, hiển thị thẳng các nút chức năng thay vì chỉ nút 3 chấm
        if (showQuickActions) {
          const actions = STATUS_ACTIONS[order.status] ?? [];
          // Chỉ hiển thị các action forward trong status hiện tại của order
          const renderableActions = order.status === "CONFIRMED" ? actions : [];

          return (
            <Space
              size={6}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                aria-label="Xem chi tiết"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/orders/${order._id}`);
                }}
              >
                Xem
              </Button>
              {renderableActions.map((action) => {
                const isDanger = action.color === "red";
                const icon =
                  action.targetStatus === "PACKING" ? (
                    <InboxOutlined />
                  ) : action.targetStatus === "CANCELLED" ? (
                    <StopOutlined />
                  ) : (
                    <CheckCircleOutlined />
                  );
                return (
                  <Button
                    key={action.targetStatus}
                    type={isDanger ? "default" : "primary"}
                    danger={isDanger}
                    icon={icon}
                    size="small"
                    aria-label={action.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction(order, action.targetStatus, action.label);
                    }}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </Space>
          );
        }

        // Mặc định: dropdown menu 3 chấm
        return (
          <Dropdown
            trigger={["click"]}
            getPopupContainer={() => document.body}
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
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              aria-label="Thao tác đơn hàng"
            />
          </Dropdown>
        );
      },
    },
  ], [router, orders, getOrderItemTotals, showQuickActions, handleQuickAction]);

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

  // Title dynamic theo status filter (từ URL ?status=...)
  const pageTitle = useMemo(() => {
    if (!status) return "Đơn hàng";
    const label = ORDER_STATUS_LABELS[status as OrderStatus];
    return label ? `Đơn hàng · ${label}` : "Đơn hàng";
  }, [status]);

  return (
    <PageContainer>
      <PageHeader
        title={pageTitle}
        subtitle={`${total} đơn hàng`}
          breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Đơn hàng" },
        ]}
      />

      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm mã đơn, tên khách hàng..."
          onRefresh={() => void refetch()}
          loading={loading}
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
          />
        ) : (
          <DataTable
            columns={columns}
            data={orders as unknown as Record<string, unknown>[]}
            loading={loading}
            pagination={pagination}
            rowKey="_id"
            scroll={{ x: 1810 }}
            onRow={(record) => ({
              onClick: () => router.push(`/orders/${record._id as string}`),
              style: { cursor: "pointer" },
            })}
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

      <ConfirmDialog
        open={!!quickActionTarget}
        title={`${quickActionTarget?.label ?? ""} đơn hàng`}
        content={
          quickActionTarget
            ? `Bạn có chắc chắn muốn ${quickActionTarget.label.toLowerCase()} đơn hàng ${
                quickActionTarget.order.orderCode
              }?`
            : ""
        }
        type={
          quickActionTarget?.targetStatus === "CANCELLED" ? "delete" : "warning"
        }
        confirmText={quickActionTarget?.label ?? "Xác nhận"}
        loading={quickActionLoading}
        onConfirm={handleConfirmQuickAction}
        onCancel={() => setQuickActionTarget(null)}
      />
    </PageContainer>
  );
}
