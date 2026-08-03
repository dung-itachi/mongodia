/**
 * StatusBadge Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display status with standardized colors.
 */

import { Tag } from "antd";

export type StatusConfig = {
  color: string;
  backgroundColor: string;
  label: string;
};

export type StatusBadgeProps = {
  status: string;
  mapping?: Record<string, StatusConfig>;
  size?: "small" | "default";
};

// Standard status color mapping
export const DEFAULT_STATUS_MAPPING: Record<string, StatusConfig> = {
  // Active statuses
  active: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Hoạt động" },
  ACTIVE: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Hoạt động" },
  enabled: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Hoạt động" },
  ENABLED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Hoạt động" },

  // Inactive statuses
  inactive: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Không hoạt động" },
  INACTIVE: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Không hoạt động" },
  disabled: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Tắt" },
  DISABLED: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Tắt" },

  // Pending statuses
  pending: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ duyệt" },
  PENDING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ duyệt" },
  PROCESSING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Đang xử lý" },
  NEW: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Mới" },
  ASSIGNED: { color: "#722ed1", backgroundColor: "#f9f0ff", label: "Đã giao" },

  // Success statuses
  success: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  SUCCESS: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  COMPLETED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Hoàn thành" },
  CONFIRMED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã xác nhận" },
  DELIVERED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao" },
  SHIPPED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao hàng" },

  // Error statuses
  error: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },
  ERROR: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },
  FAILED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Thất bại" },
  REJECTED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Từ chối" },
  CANCELLED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Đã hủy" },

  // Warning/Cancelled
  WARNING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Cảnh báo" },
  RETURNED: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Hoàn hàng" },

  // Other common statuses
  draft: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  DRAFT: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  CLOSED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã chốt" },
  PENDING_PAYMENT: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ thanh toán" },
  PREPAID: { color: "#722ed1", backgroundColor: "#f9f0ff", label: "Đã trả trước" },
  NO_ANSWER: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Không nghe máy" },
  POTENTIAL: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Tiềm năng" },
  ORDER_CREATED: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đã tạo đơn" },
  RECONCILED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đối soát" },
  SHIPPING: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đang giao" },
};

export default function StatusBadge({
  status,
  mapping = DEFAULT_STATUS_MAPPING,
  size = "default",
}: StatusBadgeProps) {
  const config = mapping[status] || {
    color: "#8c8c8c",
    backgroundColor: "#fafafa",
    label: status,
  };

  return (
    <Tag
      color={config.backgroundColor}
      style={{
        color: config.color,
        borderColor: config.color,
        fontSize: size === "small" ? 12 : 14,
        padding: size === "small" ? "0 6px" : "2px 8px",
      }}
    >
      {config.label}
    </Tag>
  );
}
