"use client";

/**
 * ==================================================
 * BATCH CHECK CUSTOMERS MODAL
 * ==================================================
 *
 * Modal tra cứu khách hàng HÀNG LOẠT từ danh sách staging.
 * Dùng cho Marketing Input: sau khi paste số / nhập đơn,
 * bấm "Check khách loạt" để biết SĐT nào đã có khách cũ (kèm đơn)
 * và SĐT nào là khách mới.
 *
 * Phân loại kết quả:
 *  - Khách cũ có đơn   (màu xanh dương) — đã từng mua
 *  - Khách cũ chưa có đơn — đã từng được tạo profile, chưa mua
 *  - Khách mới           (màu cam) — chưa có trong hệ thống
 *  - Lỗi                (màu đỏ) — không tra cứu được
 *
 * Mỗi item có thể click để mở popup chi tiết đơn (stack OrderDetailModal).
 */

import { useMemo, useState } from "react";
import { Modal, Input, Tag, Empty, Spin, Alert } from "antd";
import {
  CheckCircleOutlined,
  UserAddOutlined,
  UserOutlined,
  PhoneOutlined,
  FileTextOutlined,
  SearchOutlined,
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import Link from "next/link";

import { useBatchCustomerLookup } from "@/hooks/useCustomers";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import type { OrderListItem } from "@/types/order";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "./BatchCheckCustomersModal.module.css";

export type BatchCheckCustomersModalProps = {
  open: boolean;
  /** Danh sách SĐT cần tra cứu (lấy từ stagedLeads). */
  phones: string[];
  onClose: () => void;
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

export default function BatchCheckCustomersModal({
  open,
  phones,
  onClose,
}: BatchCheckCustomersModalProps) {
  const lang = useLanguageStore((s) => s.language);
  const [searchFilter, setSearchFilter] = useState("");
  /** ID đơn hàng muốn xem chi tiết (popup stack). */
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const { items, summary, loading, settled } = useBatchCustomerLookup(phones, {
    enabled: open && phones.length > 0,
    limit: 20,
  });

  // Lọc theo search
  const filteredItems = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const c = it.result?.customer;
      return (
        it.phone.toLowerCase().includes(q) ||
        (c?.fullName ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, searchFilter]);

  // Phân nhóm
  const groups = useMemo(() => {
    const withOrders: typeof filteredItems = [];
    const foundNoOrder: typeof filteredItems = [];
    const notFound: typeof filteredItems = [];
    const failed: typeof filteredItems = [];

    for (const it of filteredItems) {
      if (it.error) {
        failed.push(it);
        continue;
      }
      if (!it.result?.customer) {
        notFound.push(it);
        continue;
      }
      const totalOrders = it.result.statistics?.totalOrders ?? 0;
      if (totalOrders > 0) {
        withOrders.push(it);
      } else {
        foundNoOrder.push(it);
      }
    }
    return { withOrders, foundNoOrder, notFound, failed };
  }, [filteredItems]);

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={860}
        destroyOnHidden
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <HistoryOutlined />
            <span>{t("Check khách hàng loạt", lang)} ({summary.total} {t("SĐT", lang)})</span>
          </span>
        }
      >
        <div>
          {/* Summary cards */}
          <div className={styles.summaryRow}>
            <SummaryCard value={summary.total} label={t("Tổng", lang)} variant="default" />
            <SummaryCard
              value={summary.withOrders}
              label={t("Có đơn", lang)}
              variant="withOrders"
            />
            <SummaryCard
              value={summary.notFound}
              label={t("Khách mới", lang)}
              variant="notFound"
            />
            <SummaryCard value={summary.failed} label={t("Lỗi", lang)} variant="failed" />
          </div>

          {/* Search */}
          {summary.total > 5 && (
            <Input
              className={styles.searchInput}
              size="large"
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder={t("Lọc theo SĐT hoặc tên...", lang)}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          )}

          {/* Loading state */}
          {loading && (
            <div className={styles.empty}>
              <Spin /> &nbsp; {t("Đang tra cứu", lang)} {summary.total} {t("SĐT", lang)}...
            </div>
          )}

          {/* Settled — show groups */}
          {!loading && settled && summary.total === 0 && (
            <Empty description={t("Không có SĐT nào để tra cứu", lang)} />
          )}

          {!loading && settled && summary.total > 0 && (
            <>
              {groups.failed.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  title={`${groups.failed.length} ${t("SĐT tra cứu lỗi", lang)}`}
                  description={
                    <div style={{ fontSize: 12 }}>
                      {groups.failed.map((it) => (
                        <div key={it.index}>• {it.phone} — {it.error}</div>
                      ))}
                    </div>
                  }
                />
              )}

              <Group
                icon={<CheckCircleOutlined />}
                title={`${t("Khách cũ · có đơn", lang)} (${groups.withOrders.length})`}
                variant="withOrders"
                items={groups.withOrders}
                onOpenOrder={setDetailOrderId}
              />

              <Group
                icon={<UserOutlined />}
                title={`${t("Khách cũ · chưa có đơn", lang)} (${groups.foundNoOrder.length})`}
                variant="found"
                items={groups.foundNoOrder}
                onOpenOrder={setDetailOrderId}
              />

              <Group
                icon={<UserAddOutlined />}
                title={`${t("Khách mới", lang)} (${groups.notFound.length})`}
                variant="notFound"
                items={groups.notFound}
                onOpenOrder={setDetailOrderId}
              />
            </>
          )}
        </div>
      </Modal>

      <OrderDetailModal
        open={!!detailOrderId}
        orderId={detailOrderId}
        onClose={() => setDetailOrderId(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SummaryCard({
  value,
  label,
  variant,
}: {
  value: number;
  label: string;
  variant: "default" | "found" | "notFound" | "withOrders" | "failed";
}) {
  return (
    <div className={`${styles.summaryCard} ${variant !== "default" ? styles[variant] : ""}`}>
      <div className={styles.summaryValue}>{value}</div>
      <div className={styles.summaryLabel}>{label}</div>
    </div>
  );
}

function Group({
  icon,
  title,
  items,
  variant,
  onOpenOrder,
}: {
  icon: React.ReactNode;
  title: string;
  items: ReturnType<typeof useBatchCustomerLookup>["items"];
  variant: "found" | "notFound" | "withOrders";
  onOpenOrder: (orderId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={`${styles.sectionTitle} ${styles[variant]}`}>
        {icon} {title}
      </div>
      <div className={styles.itemList}>
        {items.map((it) => (
          <BatchItem
            key={it.index}
            item={it}
            variant={variant}
            onOpenOrder={onOpenOrder}
          />
        ))}
      </div>
    </div>
  );
}

function BatchItem({
  item,
  variant,
  onOpenOrder,
}: {
  item: ReturnType<typeof useBatchCustomerLookup>["items"][number];
  variant: "found" | "notFound" | "withOrders";
  onOpenOrder: (orderId: string) => void;
}) {
  const lang = useLanguageStore((s) => s.language);
  const customer = item.result?.customer;
  const orders = item.result?.orders.items ?? [];
  const totalOrdersInSystem = item.result?.orders.total ?? orders.length;
  const stats = item.result?.statistics;

  const INITIAL_VISIBLE = 3;
  const [expanded, setExpanded] = useState(false);
  const visibleOrders = expanded ? orders : orders.slice(0, INITIAL_VISIBLE);
  const hiddenCount = orders.length - INITIAL_VISIBLE;
  const moreInSystem = Math.max(0, totalOrdersInSystem - orders.length);

  return (
    <div className={styles.item}>
      <div className={`${styles.itemAvatar} ${variant === "notFound" ? styles.notFound : ""}`}>
        {variant === "notFound" ? <UserAddOutlined /> : getInitials(customer?.fullName)}
      </div>

      <div className={styles.itemMain}>
        <div className={styles.itemHeaderRow}>
          <span className={styles.itemPhone}>
            <PhoneOutlined /> {item.phone}
          </span>
          {customer && (
            <span className={styles.itemName}>{customer.fullName}</span>
          )}
          {customer && (
            <Tag color={customer.status === "ACTIVE" ? "green" : "default"}>
              {customer.statusLabel}
            </Tag>
          )}
          {variant === "notFound" && (
            <Tag color="orange">{t("Khách mới", lang)}</Tag>
          )}
        </div>

        {customer && stats && (
          <div className={styles.itemMetaRow}>
            <span className={styles.itemMetaItem}>
              <strong>{stats.totalOrders}</strong> {t("đơn", lang)}
            </span>
            <span className={styles.itemMetaItem}>
              {t("DT", lang)}: <strong>{formatCurrency(stats.totalRevenue, "VND")}</strong>
            </span>
            <span className={styles.itemMetaItem}>
              {t("Gần nhất", lang)}: <strong>{formatDate(stats.lastOrderDate)}</strong>
            </span>
            {customer.saleEmployee && (
              <span className={styles.itemMetaItem}>
                {t("Sale", lang)}: <strong>{customer.saleEmployee.fullName}</strong>
              </span>
            )}
          </div>
        )}

        {orders.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontSize: 11,
                color: "#8c8c8c",
                textTransform: "uppercase",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {t("Đơn gần nhất", lang)}
              <span style={{ textTransform: "none", color: "#bfbfbf" }}>
                ({totalOrdersInSystem})
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {visibleOrders.map((o) => (
                <OrderRow key={o._id} order={o} onOpen={() => onOpenOrder(o._id)} />
              ))}

              {!expanded && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "4px 8px",
                    fontSize: 11,
                    color: "#1890ff",
                    fontStyle: "italic",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#096dd9")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1890ff")}
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                  +{hiddenCount} {t("đơn nữa (đã fetch) — bấm để xem", lang)}
                </button>
              )}

              {expanded && orders.length > INITIAL_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "4px 8px",
                    fontSize: 11,
                    color: "#8c8c8c",
                    fontStyle: "italic",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <UpOutlined style={{ fontSize: 10 }} />
                  {t("Thu gọn", lang)}
                </button>
              )}

              {moreInSystem > 0 && customer?._id && (
                <Link
                  href={`/customers/${customer._id}`}
                  target="_blank"
                  style={{
                    fontSize: 11,
                    color: "#fa8c16",
                    fontStyle: "italic",
                    textDecoration: "none",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  +{moreInSystem} {t("đơn cũ hơn — mở trang khách để xem →", lang)}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.itemActions}>
        {variant === "notFound" && (
          <Tag color="orange" icon={<UserAddOutlined />}>
            {t("Có thể tạo mới", lang)}
          </Tag>
        )}
        {variant === "withOrders" && (
          <Tag color="blue">{t("Khách quay lại", lang)}</Tag>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order, onOpen }: { order: OrderListItem; onOpen: () => void }) {
  return (
    <a
      onClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      href="#"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 8px",
        background: "#fafafa",
        borderRadius: 4,
        fontSize: 12,
        color: "#262626",
        textDecoration: "none",
        gap: 8,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
        <FileTextOutlined style={{ color: "#1890ff" }} />
        <strong style={{ color: "#1890ff" }}>{order.orderCode}</strong>
        <OrderStatusTag status={order.status} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#595959" }}>
          {formatDate(order.createdAt)}
        </span>
      </span>
      <strong style={{ color: "#52c41a", whiteSpace: "nowrap" }}>
        {formatCurrency(order.totalAmount, order.currency || "VND")}
      </strong>
    </a>
  );
}

function OrderStatusTag({ status }: { status: string }) {
  const color =
    status === "DELIVERED" ? "green" :
    status === "CANCELLED" ? "red" :
    status === "WAIT_CONFIRM" ? "orange" :
    "blue";
  return (
    <Tag color={color} style={{ margin: 0, fontSize: 11 }}>
      {status}
    </Tag>
  );
}
