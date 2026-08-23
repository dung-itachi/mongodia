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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
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
  UndoOutlined,
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
import { ORDER_STATUS_LABELS, OrderStatus } from "@/constants/orderStatus";
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
  const lang = useLanguageStore((s) => s.language);
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

  // Show quick action buttons only for CONFIRMED and SHIPPING status
  const showQuickActions = status === "CONFIRMED";
  const showShippingActions = status === "SHIPPING";

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
      message.success(t("Đã làm mới đơn hàng", lang));
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("Làm mới đơn hàng thất bại", lang)
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
        status: status as OrderStatus | undefined, // urlStatus filter để funnel phản ánh view hiện tại
        dateFrom: dateRange?.[0],
        dateTo: dateRange?.[1],
      });
      setStatsData(data);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("Lấy thống kê thất bại", lang)
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

  /**
   * Tạo nội dung confirm dialog chi tiết cho quick action
   */
  const getQuickActionContent = useCallback((target: NonNullable<typeof quickActionTarget>) => {
    const { order, targetStatus } = target;
    const totals = getOrderItemTotals(order);

    const vndFormatter = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });

    const mntFormatter = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    });

    const labelText = target.label === t("Giao TC", lang) ? t("Thành công", lang) : target.label;
    const typeText = target.label === t("Giao TC", lang) ? t("giao hàng thành công", lang) :
                     target.label === t("Hoàn", lang) ? t("hoàn đơn hàng", lang) :
                     `${target.label.toLowerCase()} ${t("đơn hàng", lang)}`;

    return {
      title: `${labelText} ${t("đơn hàng", lang)}`,
      content: (
        <div style={{ textAlign: "left" }}>
          <p>{t("Bạn có chắc chắn muốn", lang)} {typeText}?</p>
          <div style={{
            background: "#f5f5f5",
            padding: "12px",
            borderRadius: "8px",
            marginTop: "12px"
          }}>
            <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>
              {order.customerName || t("Khách hàng", lang)}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#666" }}>
              📞 {order.customerPhone || t("Không có SĐT", lang)}
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#666" }}>
              📦 {totals.comboName}
            </p>
            <p style={{ margin: "0 0 4px 0", fontWeight: 500 }}>
              💰 {mntFormatter.format(totals.mntSubtotal)} ₮
            </p>
            <p style={{ margin: 0, color: "#1890ff", fontWeight: 500 }}>
              ({vndFormatter.format(totals.vndSubtotal)})
            </p>
          </div>
          <p style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
            {t("Mã đơn", lang)}: <strong>{order.orderCode}</strong>
          </p>
        </div>
      ),
      type: targetStatus === "CANCELLED" || targetStatus === "RETURNED" ? "delete" : "warning",
    };
  }, [getOrderItemTotals]);

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
      message.success(`${t("Đã chuyển đơn sang", lang)} "${targetLabel}"`);
      setQuickActionTarget(null);
      void refetch();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("Chuyển trạng thái thất bại", lang)
      );
      // Refetch để danh sách phản ánh trạng thái mới nhất trong DB
      // (tránh user click lại đơn đã đổi trạng thái do call trước lỗi).
      void refetch();
    } finally {
      setQuickActionLoading(false);
    }
  }, [quickActionTarget, changeStatusMutation, refetch, getQuickActionContent]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync(deleteId);
      message.success(t("Xóa đơn hàng thành công", lang));
      setDeleteId(null);
      void refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("Xóa đơn hàng thất bại", lang));
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
      title: t("STT", lang),
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (_: unknown, _record: Record<string, unknown>, index?: number) => (
        <span style={{ color: "#8c8c8c" }}>{(page - 1) * pageSize + (index ?? 0) + 1}</span>
      ),
    },
    {
      key: "orderCode",
      title: t("Mã đơn", lang),
      dataIndex: "orderCode",
      width: 140,
      render: (value: unknown) => <span>{String(value)}</span>,
    },
    {
      key: "customerName",
      title: t("Khách hàng", lang),
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
      title: t("Combo", lang),
      width: 200,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).comboName,
    },
    {
      key: "product",
      title: t("Sản phẩm", lang),
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
      title: t("Combo sản phẩm", lang),
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
      title: t("Tổng SP", lang),
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).productQuantity || "-",
    },
    {
      key: "totalGifts",
      title: t("Tổng quà", lang),
      width: 90,
      align: "center" as const,
      render: (_: unknown, record: Record<string, unknown>) => getOrderItemTotals(record as unknown as OrderListItem).giftQuantity || "-",
    },
    {
      key: "amountMNT",
      title: t("Số tiền (MNT)", lang),
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
      title: t("Số tiền (VND quy đổi)", lang),
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
          <Tooltip title={`${t("Tỷ giá: 1 MNT =", lang)} ${rate} VND`}>
            <span style={{ fontWeight: 500 }}>{formatter.format(vndSubtotal)}</span>
          </Tooltip>
        );
      },
    },
    {
      key: "saleEmployee",
      title: t("Sale", lang),
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
      title: t("Trạng thái", lang),
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
        <Tooltip title={t("Đánh dấu đã gọi điện xác nhận với khách trước khi đóng gói", lang)}>
          <span>{t("Xác nhận", lang)}</span>
        </Tooltip>
      ),
      dataIndex: "isCalledForConfirmation",
      width: 110,
      align: "center" as const,
      hidden: showShippingActions,
      render: (_: unknown, record: Record<string, unknown>) => {
        const order = record as unknown as OrderListItem;
        const checked = order.isCalledForConfirmation === true;
        return (
          <Tooltip
            title={
              checked
                ? t("Đã gọi xác nhận (click để bỏ)", lang)
                : t("Chưa gọi xác nhận — click để đánh dấu", lang)
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
                      : t("Không thể cập nhật xác nhận", lang)
                  );
                }
              }}
            >
              {checked ? t("Đã gọi", lang) : t("Chưa gọi", lang)}
            </Checkbox>
          </Tooltip>
        );
      },
    },
    {
      key: "totalAmount",
      title: t("Tổng tiền", lang),
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
      title: t("Ngày tạo", lang),
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
      title: t("Thao tác", lang),
      width: showQuickActions || showShippingActions ? 280 : 100,
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
                aria-label={t("Xem chi tiết", lang)}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/orders/${order._id}`);
                }}
              >
                {t("Xem", lang)}
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
                const actionLabel = t(action.label, lang);
                const button = (
                  <Button
                    key={action.targetStatus}
                    type={isDanger ? "default" : "primary"}
                    danger={isDanger}
                    icon={icon}
                    size="small"
                    aria-label={actionLabel}
                    disabled={gatingBlock}
                    onClick={(e) => {
                      if (gatingBlock) {
                        e.stopPropagation();
                        message.warning(
                          t("Cần đánh dấu 'Đã gọi xác nhận' trước khi đóng gói", lang)
                        );
                        return;
                      }
                      e.stopPropagation();
                      handleQuickAction(order, action.targetStatus, actionLabel);
                    }}
                  >
                    {actionLabel}
                  </Button>
                );
                return gatingBlock ? (
                  <Tooltip
                    key={action.targetStatus}
                    title={t("Tick 'Đã gọi xác nhận' ở cột Xác nhận trước", lang)}
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

        // Khi filter theo status=SHIPPING, hiển thị nút Giao TC và Hoàn
        if (showShippingActions) {
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
                aria-label={t("Xem chi tiết", lang)}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/orders/${order._id}`);
                }}
              >
                {t("Xem", lang)}
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                aria-label={t("Giao thành công", lang)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAction(order, "DELIVERED", t("Giao TC", lang));
                }}
              >
                {t("Giao TC", lang)}
              </Button>
              <Button
                type="default"
                danger
                icon={<UndoOutlined />}
                size="small"
                aria-label={t("Hoàn đơn", lang)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAction(order, "RETURNED", t("Hoàn", lang));
                }}
              >
                {t("Hoàn", lang)}
              </Button>
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
                  label: t("Xem chi tiết", lang),
                  onClick: () => router.push(`/orders/${order._id}`),
                },
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: t("Sửa", lang),
                  disabled: order.status === "DELIVERED" || order.status === "CANCELLED",
                  onClick: () => router.push(`/orders/${order._id}?mode=edit`),
                },
                { type: "divider" },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: t("Xóa", lang),
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
              aria-label={t("Thao tác đơn hàng", lang)}
            />
          </Dropdown>
        );
      },
    },
  ], [router, getOrderItemTotals, showQuickActions, showShippingActions, handleQuickAction, toggleConfirmCallMutation, page, pageSize]);

  const columns = tableColumns;

  // Pagination config
  const pagination = useMemo(() => ({
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (totalCount: number) => `${t("Tổng", lang)}: ${totalCount}`,
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
      label: t("Trạng thái", lang),
      options: [
        { value: "", label: t("Tất cả trạng thái", lang) },
        ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
          value,
          label: t(label, lang),
        })),
      ],
    },
    {
      key: "dateRange",
      type: "dateRange" as const,
      label: t("Ngày tạo", lang),
    },
  ], [lang]);

  const filterValues = useMemo(() => ({
    status: status ?? "",
    dateRange,
  }), [status, dateRange]);

  // Title dynamic theo status filter (từ URL ?status=...)
  const pageTitle = useMemo(() => {
    if (!status) return t("Đơn hàng", lang);
    if (isReconciliationView(status)) return t("Đối soát đơn hàng", lang);
    const label = ORDER_STATUS_LABELS[status as OrderStatus];
    return label ? `${t("Đơn hàng", lang)} · ${t(label, lang)}` : t("Đơn hàng", lang);
  }, [status, lang]);

  const titleTooltip = useMemo(() => {
    if (!status || isReconciliationView(status)) return;
    const tooltipMap: Record<OrderStatus, string> = {
      [OrderStatus.WAIT_CONFIRM]: t("Sale vừa chốt đơn, chưa xác nhận lại với khách", lang),
      [OrderStatus.CONFIRMED]: t("Đơn đã được xác nhận, sẵn sàng chuyển giao cho kho", lang),
      [OrderStatus.PACKING]: t("Nhân viên kho đang chuẩn bị và đóng gói đơn hàng", lang),
      [OrderStatus.SHIPPING]: t("Đơn hàng đang được vận chuyển đến khách", lang),
      [OrderStatus.DELIVERED]: t("Giao hàng thành công, đang chờ đối soát với shipper", lang),
      [OrderStatus.RETURNED]: t("Khách không nhận hàng, đơn hàng đã được hoàn về", lang),
      [OrderStatus.RECONCILED]: t("Shipper đã trả tiền — đây mới là doanh thu thực", lang),
      [OrderStatus.CANCELLED]: t("Đơn hàng đã bị hủy, không được tính doanh thu", lang),
    };
    return tooltipMap[status as OrderStatus];
  }, [status, lang]);

  // Khi URL ?status=RECONCILED → render ReconciliationPanel (giao diện riêng)
  if (isReconciliationView(status)) {
    return (
      <PageContainer>
        <PageHeader
          title={pageTitle}
          titleTooltip={titleTooltip}
          subtitle={t("Đối soát các đơn Giao thành công & Hoàn trả sang Đã đối soát", lang)}
          breadcrumb={[
            { label: t("Trang chủ", lang), href: "/" },
            { label: t("Đơn hàng", lang) },
            { label: t("Đối soát", lang) },
          ]}
          actions={
            <Space>
              <Button
                type="default"
                icon={<BarChartOutlined />}
                onClick={() => void handleOpenStatistics()}
              >
                {t("Thống kê đơn hàng", lang)}
              </Button>
              <Button
                type="primary"
                icon={<ReloadOutlined spin={loading} />}
                onClick={() => void handleRefresh()}
                loading={loading}
              >
                {t("Làm mới đơn hàng", lang)}
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
        titleTooltip={titleTooltip}
        subtitle={`${total} ${t("đơn hàng", lang)}`}
          breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Đơn hàng", lang) },
        ]}
        actions={
          <Space>
            <Button
              type="default"
              icon={<BarChartOutlined />}
              onClick={() => void handleOpenStatistics()}
            >
              {t("Thống kê đơn hàng", lang)}
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => void handleRefresh()}
              loading={loading}
            >
              {t("Làm mới đơn hàng", lang)}
            </Button>
          </Space>
        }
      />

      <div className="card">
        <TableToolbar
          searchValue={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder={t("Tìm mã đơn, tên khách hàng...", lang)}
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
            title={t("Chưa có đơn hàng", lang)}
            description={
              debouncedKeyword || status || dateRange
                ? t("Không tìm thấy đơn hàng nào phù hợp với bộ lọc", lang)
                : t("Bắt đầu bằng cách tạo đơn hàng mới", lang)
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
        title={t("Xóa đơn hàng", lang)}
        content={t("Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.", lang)}
        type="delete"
        confirmText={t("Xóa", lang)}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={!!quickActionTarget}
        title={quickActionTarget ? getQuickActionContent(quickActionTarget).title : ""}
        content={quickActionTarget ? getQuickActionContent(quickActionTarget).content : ""}
        type={(() => {
          if (!quickActionTarget) return "warning" as const;
          const targetType = getQuickActionContent(quickActionTarget).type;
          return (targetType === "delete" || targetType === "warning" || targetType === "confirm") ? targetType : "warning" as const;
        })()}
        confirmText={quickActionTarget?.label === t("Giao TC", lang) ? t("Thành công", lang) : (quickActionTarget?.label ?? t("Xác nhận", lang))}
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
