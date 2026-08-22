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
import { Button, Checkbox, Dropdown, Space, Tooltip } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  StopOutlined,
  PhoneOutlined,
  ReloadOutlined,
  BarChartOutlined,
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

import { useOrders, useDeleteOrder, useChangeOrderStatus, useToggleOrderConfirmCall, useOrderStatistics } from "@/hooks/useOrders";
import { useDebounce } from "@/hooks/useDebounce";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import type { OrderStatus } from "@/constants/orderStatus";
import { STATUS_ACTIONS } from "@/configs/order-status.config";
import type { OrderListItem, OrderStatisticsResponse } from "@/types/order";
import ReconciliationPanel from "./reconciliation/ReconciliationPanel";
import OrderStatisticsModal from "./OrderStatisticsModal";

/**
 * Khi URL `?status=RECONCILED` thì hiển thị giao diện Đối soát
 * (panel riêng) thay vì danh sách bảng mặc định.
 */
function isReconciliationView(status: string | undefined): boolean {
  return status?.toUpperCase() === "RECONCILED";
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const message = useMessage();
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

  // Popup thống kê — chỉ gọi API khi user click nút.
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<OrderStatisticsResponse | null>(null);
  const statsMutation = useOrderStatistics();

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

  // Toggle cờ "đã gọi xác nhận" — chỉ dùng cho status=CONFIRMED
  const toggleConfirmCallMutation = useToggleOrderConfirmCall();

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

  /**
   * Làm mới đơn hàng: gọi refetch() rồi hiện thông báo nhỏ khi hoàn tất.
   * Dùng chung cho cả nút Refresh ở header và ở TableToolbar.
   * Không reset filter/page → trải nghiệm tốt hơn F5.
   */
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      message.success("Đã làm mới đơn hàng");
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Làm mới đơn hàng thất bại"
      );
    }
  }, [refetch]);

  /**
   * Mở popup thống kê đơn hàng.
   * - Chỉ fetch khi click (không auto).
   * - Gửi kèm filter hiện tại (status từ URL, keyword đã debounce, date range).
   * - Đặt filter.status vào mutation để popup phản ánh đúng view đang xem.
   */
  const handleOpenStatistics = useCallback(async () => {
    setStatsOpen(true);
    setStatsData(null); // reset skeleton trong modal
    try {
      const data = await statsMutation.mutateAsync({
        keyword: debouncedKeyword,
        status, // urlStatus filter để funnel phản ánh view hiện tại
        dateFrom: dateRange?.[0],
        dateTo: dateRange?.[1],
      });
      setStatsData(data);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Lấy thống kê thất bại"
      );
      setStatsOpen(false);
    }
  }, [statsMutation, debouncedKeyword, status, dateRange]);

  const handleCloseStatistics = useCallback(() => {
    setStatsOpen(false);
  }, []);

  const getOrderItemTotals = useCallback((order: OrderListItem) => {
    const items = order.orderItems ?? [];
    const mntSubtotal = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0)
      || (order.totalAmount ?? 0);
    const rate = order.exchangeRate ?? 7;
    const vndSubtotal = mntSubtotal * rate;
    return {
      comboName: items.map((item) => item.comboName || item.productName).filter(Boolean).join(", ") || order.combo?.name || order.product?.name || "-",
      comboQuantity: items.reduce((sum, item) => sum + (item.comboQuantity ?? item.quantity ?? 0), 0) || order.quantity,
      productQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.packageQuantity, 0),
      giftQuantity: items.reduce((sum, item) => sum + item.comboQuantity * item.giftQuantity, 0),
      mntSubtotal,
      vndSubtotal,
      rate,
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
      // Refetch để danh sách phản ánh trạng thái mới nhất trong DB
      // (tránh user click lại đơn đã đổi trạng thái do call trước lỗi).
      void refetch();
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

  // Table columns - for CONFIRMED status, each customer has 1 combo, no need for combo quantity column
  const tableColumns = useMemo(() => [
    {
      // Cột STT chỉ dành cho UI, không liên kết với dữ liệu đơn hàng.
      // Số chạy liên tục qua các trang: (currentPage - 1) * pageSize + index + 1.
      key: "stt",
      title: "STT",
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (_: unknown, _record: Record<string, unknown>, index?: number) => (
        <span style={{ color: "#8c8c8c" }}>{(page - 1) * pageSize + (index ?? 0) + 1}</span>
      ),
    },
    {
      key: "orderCode",
      title: "Mã đơn",
      dataIndex: "orderCode",
      width: 140,
      render: (value: unknown) => <span>{String(value)}</span>,
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
      key: "amountMNT",
      title: "Số tiền (MNT)",
      width: 140,
      align: "right" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const mnt = getOrderItemTotals(order).mntSubtotal;
        const formatted = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 0,
        }).format(mnt);
        return <span style={{ fontWeight: 500 }}>{formatted} ₮</span>;
      },
    },
    {
      key: "amountVND",
      title: "Số tiền (VND quy đổi)",
      width: 160,
      align: "right" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const { vndSubtotal, rate } = getOrderItemTotals(order);
        const formatter = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        });
        return (
          <Tooltip title={`Tỷ giá: 1 MNT = ${rate} VND`}>
            <span style={{ fontWeight: 500 }}>{formatter.format(vndSubtotal)}</span>
          </Tooltip>
        );
      },
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
      // Cột "Xác nhận gọi" — chỉ hiển thị khi đang filter CONFIRMED.
      key: "confirmCall",
      title: (
        <Tooltip title="Đánh dấu đã gọi điện xác nhận với khách trước khi đóng gói">
          <span>Xác nhận</span>
        </Tooltip>
      ),
      dataIndex: "isCalledForConfirmation",
      width: 110,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const checked = order.isCalledForConfirmation === true;
        return (
          <Tooltip
            title={
              checked
                ? "Đã gọi xác nhận (click để bỏ)"
                : "Chưa gọi xác nhận — click để đánh dấu"
            }
          >
            <Checkbox
              checked={checked}
              disabled={!showQuickActions || toggleConfirmCallMutation.isPending}
              onChange={async (e) => {
                try {
                  await toggleConfirmCallMutation.mutateAsync({
                    id: order._id,
                    value: e.target.checked,
                  });
                } catch (err) {
                  message.error(
                    err instanceof Error
                      ? err.message
                      : "Không thể cập nhật xác nhận"
                  );
                }
              }}
            >
              {checked ? "Đã gọi" : "Chưa gọi"}
            </Checkbox>
          </Tooltip>
        );
      },
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
      width: showQuickActions ? 320 : 100,
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
                const isPacking = action.targetStatus === "PACKING";
                // Gate "Đóng gói" — chỉ enable khi đã tick xác nhận gọi.
                const gatingBlock = isPacking && !order.isCalledForConfirmation;
                const icon =
                  action.targetStatus === "PACKING" ? (
                    <InboxOutlined />
                  ) : action.targetStatus === "CANCELLED" ? (
                    <StopOutlined />
                  ) : (
                    <CheckCircleOutlined />
                  );
                const button = (
                  <Button
                    key={action.targetStatus}
                    type={isDanger ? "default" : "primary"}
                    danger={isDanger}
                    icon={icon}
                    size="small"
                    aria-label={action.label}
                    disabled={gatingBlock}
                    onClick={(e) => {
                      if (gatingBlock) {
                        e.stopPropagation();
                        message.warning(
                          "Cần đánh dấu 'Đã gọi xác nhận' trước khi đóng gói"
                        );
                        return;
                      }
                      e.stopPropagation();
                      handleQuickAction(order, action.targetStatus, action.label);
                    }}
                  >
                    {action.label}
                  </Button>
                );
                return gatingBlock ? (
                  <Tooltip
                    key={action.targetStatus}
                    title="Tick 'Đã gọi xác nhận' ở cột Xác nhận trước"
                  >
                    <span>{button}</span>
                  </Tooltip>
                ) : (
                  button
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
  ], [router, getOrderItemTotals, showQuickActions, handleQuickAction, toggleConfirmCallMutation, page, pageSize]);

  const columns = tableColumns;

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
    if (isReconciliationView(status)) return "Đối soát đơn hàng";
    const label = ORDER_STATUS_LABELS[status as OrderStatus];
    return label ? `Đơn hàng · ${label}` : "Đơn hàng";
  }, [status]);

  // Khi URL ?status=RECONCILED → render ReconciliationPanel (giao diện riêng)
  if (isReconciliationView(status)) {
    return (
      <PageContainer>
        <PageHeader
          title={pageTitle}
          subtitle="Đối soát các đơn Giao thành công & Hoàn trả sang Đã đối soát"
          breadcrumb={[
            { label: "Trang chủ", href: "/" },
            { label: "Đơn hàng" },
            { label: "Đối soát" },
          ]}
          actions={
            <Space>
              <Button
                type="default"
                icon={<BarChartOutlined />}
                onClick={() => void handleOpenStatistics()}
              >
                Thống kê đơn hàng
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined spin={loading} />}
                onClick={() => void handleRefresh()}
                loading={loading}
              >
                Làm mới đơn hàng
              </Button>
            </Space>
          }
        />
        <ReconciliationPanel />

        <OrderStatisticsModal
          open={statsOpen}
          data={statsData}
          loading={statsMutation.isPending}
          onClose={handleCloseStatistics}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={pageTitle}
        subtitle={`${total} đơn hàng`}
          breadcrumb={[
          { label: "Trang chủ", href: "/" },
          { label: "Đơn hàng" },
        ]}
        actions={
          <Space>
            <Button
              type="default"
              icon={<BarChartOutlined />}
              onClick={() => void handleOpenStatistics()}
            >
              Thống kê đơn hàng
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => void handleRefresh()}
              loading={loading}
            >
              Làm mới đơn hàng
            </Button>
          </Space>
        }
      />

      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm mã đơn, tên khách hàng..."
          onRefresh={() => void handleRefresh()}
          loading={loading}
        />

        <div style={{ marginBottom: 16 }}>
          <FilterBar
            items={customFilterItems}
            values={filterValues}
            onChange={handleFilterChange}
            loading={loading}
          />
        </div>

        {loading ? (
          <SkeletonTable rows={10} columns={14} />
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
            scroll={{ x: 2300 }}
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

      <OrderStatisticsModal
        open={statsOpen}
        data={statsData}
        loading={statsMutation.isPending}
        onClose={handleCloseStatistics}
      />
    </PageContainer>
  );
}
