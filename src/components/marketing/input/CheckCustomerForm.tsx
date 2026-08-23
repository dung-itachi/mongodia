"use client";

/**
 * ==================================================
 * CHECK CUSTOMER FORM (Reusable)
 * ==================================================
 *
 * Form tra cứu khách hàng độc lập: 1 ô input + 1 nút Check.
 * Người dùng nhập SĐT hoặc tên khách → nhấn Check → kết quả
 * (thông tin khách + lịch sử đơn hàng) hiển thị trong **popup (Modal)**.
 *
 * Dùng độc lập ở /marketing/input (đặt ở trên cùng) hoặc bất kỳ
 * trang nào cần "check khách trước khi tạo mới".
 *
 * Backing API: GET /api/customers/lookup?phone=...
 */

import { useState, useCallback } from "react";
import { Input, Button, Empty, Spin, Tag, Tooltip, Modal } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ShoppingOutlined,
  RightOutlined,
} from "@ant-design/icons";

import { useCustomerLookup } from "@/hooks/useCustomers";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import type { OrderStatus } from "@/constants/orderStatus";
import type { OrderListItem } from "@/types/order";
import type { CustomerResponse } from "@/types/customer";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "./CheckCustomerForm.module.css";

const ORDER_LIMIT = 5;

export type CheckCustomerFormProps = {
  /** Placeholder cho input. */
  placeholder?: string;
  /** Giá trị khởi tạo cho input. */
  initialValue?: string;
  /** Số đơn tối đa hiển thị trong lịch sử. */
  orderLimit?: number;
  /** Khi người dùng nhấn "Chọn khách này" (nếu được bật). */
  onPickCustomer?: (customer: CustomerResponse) => void;
  /** Hiển thị nút "Chọn khách này" trong header kết quả. */
  showPickButton?: boolean;
  /** Label của nút submit (mặc định: "Check khách"). */
  buttonLabel?: string;
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

export default function CheckCustomerForm({
  placeholder,
  initialValue,
  orderLimit = ORDER_LIMIT,
  onPickCustomer,
  showPickButton = false,
  buttonLabel,
}: CheckCustomerFormProps) {
  const lang = useLanguageStore((s) => s.language);
  const [input, setInput] = useState(initialValue ?? "");
  const [query, setQuery] = useState(initialValue ?? "");
  /** Modal hiển thị kết quả. */
  const [modalOpen, setModalOpen] = useState(false);
  /** Modal hiển thị chi tiết đơn hàng (stack popup). */
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const { result, loading, fetching } = useCustomerLookup(
    { phone: query, limit: orderLimit },
    { enabled: Boolean(query) }
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setModalOpen(true);
  }, [input]);

  const handleClear = useCallback(() => {
    setInput("");
    setQuery("");
    setModalOpen(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handlePick = useCallback(
    (customer: CustomerResponse) => {
      onPickCustomer?.(customer);
      setModalOpen(false);
    },
    [onPickCustomer]
  );

  const handleOpenOrder = useCallback((orderId: string) => {
    setDetailOrderId(orderId);
  }, []);

  const handleCloseOrder = useCallback(() => {
    setDetailOrderId(null);
  }, []);

  const defaultPlaceholder = placeholder ?? t("Nhập SĐT hoặc tên khách hàng để tra cứu...", lang);
  const defaultButtonLabel = buttonLabel ?? t("Check khách", lang);

  return (
    <>
      {/* Form inline ở đầu trang */}
      <div className={styles.container}>
        <div className={styles.header}>
          <SearchOutlined className={styles.headerIcon} />
          <span>{t("Check khách hàng", lang)}</span>
          <span className={styles.headerHint}>
            {t("Tra cứu SĐT / tên khách — xem lịch sử đơn trước khi paste số", lang)}
          </span>
        </div>

        <div className={styles.formRow}>
          <div className={styles.inputWrap}>
            <Input
              size="large"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSubmit}
              placeholder={defaultPlaceholder}
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              disabled={loading}
            />
          </div>
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleSubmit}
            loading={fetching}
            disabled={!input.trim()}
          >
            {defaultButtonLabel}
          </Button>
          {query && (
            <Button size="large" onClick={handleClear} disabled={loading}>
              {t("Xóa", lang)}
            </Button>
          )}
        </div>
      </div>

      {/* Popup hiển thị kết quả */}
      <Modal
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={760}
        destroyOnHidden
        mask={{ closable: !loading }}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ShoppingOutlined />
            <span>{t("Check khách", lang)} — {query}</span>
          </span>
        }
      >
        <div className={styles.modalBody}>
          {!result && loading ? (
            <div style={{ textAlign: "center", padding: 36, color: "#8c8c8c" }}>
              <Spin /> &nbsp; {t("Đang tra cứu...", lang)}
            </div>
          ) : !result ? (
            <Empty description={t("Có lỗi xảy ra khi tra cứu", lang)} />
          ) : !result.customer ? (
            <div className={styles.notFound}>
              <div className={styles.notFoundTitle}>
                {t("✓ Khách mới — chưa có trong hệ thống", lang)}
              </div>
              <div className={styles.notFoundHint}>
                {t("Không tìm thấy khách với từ khoá", lang)} <strong>"{query}"</strong>. {t("Có thể tạo mới lead / đơn hàng.", lang)}
              </div>
            </div>
          ) : (
            <CheckCustomerResult
              customer={result.customer}
              orders={result.orders}
              statistics={result.statistics}
              showPickButton={showPickButton}
              onPickCustomer={handlePick}
              onOpenOrder={handleOpenOrder}
            />
          )}
        </div>
      </Modal>

      {/* Popup stack: chi tiết đơn hàng */}
      <OrderDetailModal
        open={!!detailOrderId}
        orderId={detailOrderId}
        onClose={handleCloseOrder}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Result panel (rendered inside the modal)
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
  showPickButton?: boolean;
  onPickCustomer?: (customer: CustomerResponse) => void;
  onOpenOrder?: (orderId: string) => void;
};

function CheckCustomerResult({
  customer,
  orders,
  statistics,
  showPickButton,
  onPickCustomer,
  onOpenOrder,
}: ResultProps) {
  const lang = useLanguageStore((s) => s.language);
  return (
    <>
      {/* Customer header */}
      <div className={styles.customerHeader}>
        <div className={styles.avatar}>{getInitials(customer.fullName)}</div>
        <div className={styles.customerMain}>
          <div className={styles.customerNameRow}>
            <span className={styles.customerName}>{customer.fullName}</span>
            <Tag color={customer.status === "ACTIVE" ? "green" : "default"}>
              {t(customer.statusLabel, lang)}
            </Tag>
            <span className={styles.customerMetaItem}>
              <strong>{t("Mã KH:", lang)}</strong>&nbsp;{customer.customerCode}
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
                {t("Sale", lang)}: <strong>{customer.saleEmployee.fullName}</strong>
                &nbsp;({customer.saleEmployee.employeeCode})
              </span>
            )}
            {customer.marketingEmployee && (
              <span className={styles.customerMetaItem}>
                <UserOutlined />
                {t("MKT", lang)}: <strong>{customer.marketingEmployee.fullName}</strong>
                &nbsp;({customer.marketingEmployee.employeeCode})
              </span>
            )}
          </div>
        </div>
        {showPickButton && onPickCustomer && (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => onPickCustomer(customer)}
          >
            {t("Chọn khách này", lang)}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{statistics.totalOrders}</div>
          <div className={styles.statLabel}>{t("Tổng đơn", lang)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.success}`}>
            {formatCurrency(statistics.totalRevenue, "VND")}
          </div>
          <div className={styles.statLabel}>{t("Doanh thu", lang)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {formatCurrency(statistics.averageOrderValue, "VND")}
          </div>
          <div className={styles.statLabel}>{t("GTBĐH", lang)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.warning}`}>
            {formatDate(statistics.lastOrderDate)}
          </div>
          <div className={styles.statLabel}>{t("Đơn gần nhất", lang)}</div>
        </div>
      </div>

      {/* Order history */}
      <div className={styles.sectionTitle}>
        <CalendarOutlined /> &nbsp;{t("Lịch sử đơn hàng", lang)} ({orders.total})
      </div>
      {orders.items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("Khách chưa có đơn hàng nào", lang)}
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
                href={onOpenOrder ? undefined : `/orders/${o._id}`}
                target={onOpenOrder ? undefined : "_blank"}
                rel={onOpenOrder ? undefined : "noopener noreferrer"}
                onClick={
                  onOpenOrder
                    ? (e) => {
                        e.preventDefault();
                        onOpenOrder(o._id);
                      }
                    : undefined
                }
              >
                <div className={styles.orderMain}>
                  <div>
                    <span className={styles.orderCode}>{o.orderCode}</span>
                    &nbsp;
                    <Tag color={statusColor} style={{ marginLeft: 4 }}>
                      {t(statusLabel, lang)}
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
            {t("Hiển thị", lang)} {orders.items.length}/{orders.total} {t("đơn gần nhất", lang)}
          </span>
          <Button
            type="link"
            size="small"
            href={`/orders?customerId=${customer._id}`}
            target="_blank"
            icon={<RightOutlined />}
          >
            {t("Xem tất cả đơn", lang)}
          </Button>
        </div>
      )}
    </>
  );
}
