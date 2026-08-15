"use client";

/**
 * ==================================================
 * CUSTOMER LOOKUP COMPONENT (Reusable)
 * ==================================================
 *
 * Sprint — Marketing Input: "Check customer before submit"
 *
 * Tìm kiếm khách hàng theo SĐT (hoặc keyword fallback) và hiển thị
 * luôn lịch sử đơn hàng của khách đó. Dùng được ở bất kỳ trang nào
 * cần "check khách trước khi tạo mới".
 *
 * Hai cách sử dụng:
 *
 * 1) Modal tự quản (chỉ cần truyền `trigger`):
 *
 *    <CustomerLookup
 *      trigger={<Button>Check khách</Button>}
 *      defaultPhone="0123456789"
 *      onPickCustomer={(c) => console.log(c)}
 *    />
 *
 * 2) Điều khiển bên ngoài (controlled):
 *
 *    const [open, setOpen] = useState(false);
 *    <CustomerLookup
 *      open={open}
 *      onOpenChange={setOpen}
 *      defaultPhone={phone}
 *      title="Check khách trước khi tạo lead"
 *    />
 *
 * Props chính:
 *   - trigger         : Element kích hoạt modal (Button, ...)
 *   - open / onOpenChange : controlled state
 *   - defaultPhone    : SĐT mặc định điền sẵn khi mở modal
 *   - title           : Tiêu đề modal
 *   - onPickCustomer  : Callback khi user nhấn "Chọn khách này"
 *   - showPickButton  : Hiển thị nút "Chọn khách này" (mặc định true)
 *
 * API backing: GET /api/customers/lookup?phone=...
 */

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Button,
  Empty,
  Spin,
  Tag,
  Space,
  Tooltip,
  App,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  RightOutlined,
  CheckCircleOutlined,
  HomeOutlined,
} from "@ant-design/icons";

import { useCustomerLookup } from "@/hooks/useCustomers";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import type { OrderStatus } from "@/constants/orderStatus";
import type { OrderListItem } from "@/types/order";
import type { CustomerResponse } from "@/types/customer";

import styles from "./CustomerLookup.module.css";

const STATUS_ICON_MAP: Record<string, React.ReactNode> = {
  DELIVERED: <CheckCircleOutlined />,
  CANCELLED: null,
  REJECTED: null,
};

export type CustomerLookupProps = {
  /** Element that opens the modal (rendered as a clone with onClick). */
  trigger?: React.ReactElement;
  /** Controlled open state. */
  open?: boolean;
  /** Callback when the modal should open/close. */
  onOpenChange?: (open: boolean) => void;
  /** Phone to pre-fill the search with. */
  defaultPhone?: string;
  /** Modal title. */
  title?: string;
  /** When provided, the modal shows a "Chọn khách này" button. */
  onPickCustomer?: (customer: CustomerResponse) => void;
  /** Hide the pick button when caller doesn't need it. */
  showPickButton?: boolean;
  /** Page size for order history list. */
  orderLimit?: number;
};

function formatCurrency(value: number, currency: string = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getOrderSummary(order: OrderListItem): string {
  const items = order.orderItems ?? [];
  if (items.length > 0) {
    return items
      .map((it) => `${it.comboName || it.productName}${it.comboQuantity > 1 ? ` ×${it.comboQuantity}` : ""}`)
      .filter(Boolean)
      .join(", ");
  }
  return order.combo?.name || order.product?.name || "-";
}

export default function CustomerLookup({
  trigger,
  open: controlledOpen,
  onOpenChange,
  defaultPhone = "",
  title = "Check khách hàng",
  onPickCustomer,
  showPickButton = true,
  orderLimit = 5,
}: CustomerLookupProps) {
  const { message } = App.useApp();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [phone, setPhone] = useState(defaultPhone);
  const [submittedPhone, setSubmittedPhone] = useState("");

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
      setSubmittedPhone(defaultPhone);
    }
  }, [open, defaultPhone]);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const { result, loading, fetching, refetch } = useCustomerLookup(
    { phone: submittedPhone, limit: orderLimit },
    { enabled: open && Boolean(submittedPhone) }
  );

  const handleSearch = () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      void message.warning("Vui lòng nhập số điện thoại hoặc tên khách");
      return;
    }
    setSubmittedPhone(trimmed);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePick = (customer: CustomerResponse) => {
    onPickCustomer?.(customer);
    void message.success(`Đã chọn khách: ${customer.fullName}`);
    handleClose();
  };

  const triggerElement = useMemo(() => {
    if (!trigger) return null;
    const triggerEl = trigger as React.ReactElement<{
      onClick?: React.MouseEventHandler<HTMLElement>;
    }>;
    return (
      <span
        onClick={(e) => {
          // Avoid double-trigger if consumer already bound onClick
          const consumerOnClick = triggerEl.props?.onClick;
          if (consumerOnClick) {
            consumerOnClick(e);
          }
          if (!e.defaultPrevented) setOpen(true);
        }}
        style={{ display: "inline-block", cursor: "pointer" }}
      >
        {trigger}
      </span>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <>
      {triggerElement}
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width={720}
        title={
          <Space>
            <ShoppingOutlined />
            <span>{title}</span>
          </Space>
        }
        destroyOnHidden
        mask={{ closable: !loading }}
      >
        <div className={styles.container}>
          {/* Search bar */}
          <div className={styles.searchBar}>
            <Input
              className={styles.searchInput}
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Nhập SĐT (khuyến nghị) hoặc tên khách..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              disabled={loading}
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={fetching}
            >
              Tra cứu
            </Button>
          </div>

          {/* Body */}
          {!submittedPhone ? (
            <div className={styles.statusBox}>
              Nhập SĐT hoặc tên khách rồi nhấn{" "}
              <strong>Tra cứu</strong> để xem lịch sử đơn hàng.
            </div>
          ) : loading && !result ? (
            <div className={styles.statusBox}>
              <Spin /> &nbsp; Đang tra cứu...
            </div>
          ) : !result ? (
            <div className={styles.statusBox}>
              <Empty description="Có lỗi xảy ra khi tra cứu" />
              <Button onClick={() => void refetch()}>Thử lại</Button>
            </div>
          ) : !result.customer ? (
            <div className={`${styles.statusBox} ${styles.notFoundBox}`}>
              <div className={styles.notFoundTitle}>
                ✓ Khách mới — chưa có trong hệ thống
              </div>
              <div className={styles.notFoundHint}>
                SĐT/Tên <strong>"{submittedPhone}"</strong> không khớp với khách
                hàng nào. Có thể tạo mới lead/đơn.
              </div>
            </div>
          ) : (
            <CustomerLookupResult
              customer={result.customer}
              orders={result.orders}
              statistics={result.statistics}
              onPickCustomer={showPickButton ? handlePick : undefined}
            />
          )}
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Result panel (sub-component to keep the main file readable)
// ---------------------------------------------------------------------------

type ResultProps = {
  customer: CustomerResponse;
  orders: {
    items: OrderListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
  };
  onPickCustomer?: (customer: CustomerResponse) => void;
};

function CustomerLookupResult({
  customer,
  orders,
  statistics,
  onPickCustomer,
}: ResultProps) {
  return (
    <div className={styles.container}>
      {/* Customer header */}
      <div className={styles.customerHeader}>
        <div className={styles.avatar}>{getInitials(customer.fullName)}</div>
        <div className={styles.customerMain}>
          <div className={styles.customerNameRow}>
            <span className={styles.customerName}>{customer.fullName}</span>
            <Tag color={customer.status === "ACTIVE" ? "green" : "default"}>
              {customer.statusLabel}
            </Tag>
            <span className={styles.customerMetaItem}>
              <strong>Mã KH:</strong>
              &nbsp;{customer.customerCode}
            </span>
          </div>
          <div className={styles.customerMeta}>
            <span className={styles.customerMetaItem}>
              <PhoneOutlined />
              <strong>{customer.phone}</strong>
            </span>
            {customer.email && (
              <span className={styles.customerMetaItem}>
                <MailOutlined />
                {customer.email}
              </span>
            )}
            {customer.address?.street && (
              <Tooltip title={customer.address.street}>
                <span className={styles.customerMetaItem}>
                  <HomeOutlined />
                  <span
                    style={{
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                    }}
                  >
                    {customer.address.street}
                  </span>
                </span>
              </Tooltip>
            )}
            {customer.saleEmployee && (
              <span className={styles.customerMetaItem}>
                <UserOutlined />
                Sale: <strong>{customer.saleEmployee.fullName}</strong>
                &nbsp;({customer.saleEmployee.employeeCode})
              </span>
            )}
            {customer.marketingEmployee && (
              <span className={styles.customerMetaItem}>
                <UserOutlined />
                MKT: <strong>{customer.marketingEmployee.fullName}</strong>
                &nbsp;({customer.marketingEmployee.employeeCode})
              </span>
            )}
          </div>
        </div>
        {onPickCustomer && (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => onPickCustomer(customer)}
          >
            Chọn khách này
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{statistics.totalOrders}</div>
          <div className={styles.statLabel}>Tổng đơn</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.success}`}>
            {formatCurrency(statistics.totalRevenue, "VND")}
          </div>
          <div className={styles.statLabel}>Doanh thu</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue}`}>
            {formatCurrency(statistics.averageOrderValue, "VND")}
          </div>
          <div className={styles.statLabel}>GTBĐH</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.warning}`}>
            {formatDate(statistics.lastOrderDate)}
          </div>
          <div className={styles.statLabel}>Đơn gần nhất</div>
        </div>
      </div>

      {/* Order history */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <CalendarOutlined /> &nbsp;Lịch sử đơn hàng ({orders.total})
        </div>
        {orders.items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Khách chưa có đơn hàng nào"
          />
        ) : (
          <div className={styles.orderList}>
            {orders.items.map((o) => {
              const statusLabel =
                ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status;
              const statusColor =
                o.status === "DELIVERED"
                  ? "green"
                  : o.status === "CANCELLED"
                    ? "red"
                    : o.status === "WAIT_CONFIRM"
                      ? "orange"
                      : "blue";
              return (
                <a
                  key={o._id}
                  className={styles.orderItem}
                  href={`/orders/${o._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.orderMain}>
                    <div>
                      <span className={styles.orderCode}>{o.orderCode}</span>
                      &nbsp;
                      <Tag color={statusColor} style={{ marginLeft: 4 }}>
                        {STATUS_ICON_MAP[o.status]}
                        {statusLabel}
                      </Tag>
                    </div>
                    <div className={styles.orderCombo}>
                      {getOrderSummary(o)}
                    </div>
                    <div className={styles.orderDate}>
                      {formatDate(o.createdAt)}
                    </div>
                  </div>
                  <div className={styles.orderAmount}>
                    <span className={styles.orderAmountValue}>
                      {formatCurrency(o.totalAmount, o.currency || "VND")}
                    </span>
                    <RightOutlined style={{ color: "#bfbfbf", fontSize: 12 }} />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {orders.total > orders.items.length && (
          <div className={styles.orderFooter}>
            <span className={styles.orderFooterText}>
              Hiển thị {orders.items.length}/{orders.total} đơn gần nhất
            </span>
            <Button
              type="link"
              size="small"
              href={`/orders?customerId=${customer._id}`}
              target="_blank"
              icon={<RightOutlined />}
            >
              Xem tất cả đơn
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
