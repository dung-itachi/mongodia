/**
 * StatusBadge Component (Sprint 3.1 - Complete UI Kit)
 * Sprint 6.2 - Order Workflow: Added icon support
 *
 * Display status with standardized colors and optional icons.
 */

import { Tag } from "antd";
import type { ReactNode } from "react";
import {
  ClockCircleOutlined,
  CheckOutlined,
  InboxOutlined,
  CarOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  CloseCircleOutlined,
  WalletOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";

/**
 * Icon mapping for status badges (Sprint 6.2)
 * Maps icon name to React component
 */
const ICON_MAP: Record<string, ReactNode> = {
  ClockCircleOutlined: <ClockCircleOutlined />,
  CheckOutlined: <CheckOutlined />,
  InboxOutlined: <InboxOutlined />,
  CarOutlined: <CarOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  UndoOutlined: <UndoOutlined />,
  CloseCircleOutlined: <CloseCircleOutlined />,
  WalletOutlined: <WalletOutlined />,
  StopOutlined: <StopOutlined />,
  WarningOutlined: <WarningOutlined />,
};

export type StatusConfig = {
  color: string;
  backgroundColor: string;
  label: string;
  icon?: ReactNode;
};

export type StatusBadgeProps = {
  status: string;
  mapping?: Record<string, StatusConfig>;
  size?: "small" | "default";
  showIcon?: boolean;
  iconMapping?: Record<string, ReactNode>;
};

// Standard status color mapping
// Sprint 6.2: Added icons for Order statuses
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
  PENDING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ xử lý", icon: ICON_MAP.ClockCircleOutlined },
  PROCESSING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Đang xử lý" },
  NEW: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Mới" },
  ASSIGNED: { color: "#722ed1", backgroundColor: "#f9f0ff", label: "Đã giao" },

  // Success statuses
  success: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  SUCCESS: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  CONFIRMED: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đã xác nhận", icon: ICON_MAP.CheckOutlined },
  DELIVERED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao", icon: ICON_MAP.CheckCircleOutlined },

  // Order statuses (Sprint 6.2)
  WAIT_CONFIRM: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ xác nhận", icon: ICON_MAP.ClockCircleOutlined },
  PACKING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Đang đóng gói", icon: ICON_MAP.InboxOutlined },
  SHIPPING: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đang giao", icon: ICON_MAP.CarOutlined },
  SHIPPED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao hàng" },
  RETURNED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Đã hoàn trả", icon: ICON_MAP.UndoOutlined },
  RECONCILED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đối soát", icon: ICON_MAP.CheckCircleOutlined },
  CANCELLED: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Đã hủy", icon: ICON_MAP.CloseCircleOutlined },
  REJECTED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Bị từ chối", icon: ICON_MAP.StopOutlined },
  FAILED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Giao thất bại", icon: ICON_MAP.WarningOutlined },

  // Error statuses
  error: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },
  ERROR: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },

  // Warning/Cancelled
  WARNING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Cảnh báo" },

  // Other common statuses
  draft: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  DRAFT: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  CLOSED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã chốt" },
  PENDING_PAYMENT: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ thanh toán" },
  NO_ANSWER: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Không nghe máy" },
  POTENTIAL: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Tiềm năng" },
  ORDER_CREATED: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đã tạo đơn" },
};

export default function StatusBadge({
  status,
  mapping = DEFAULT_STATUS_MAPPING,
  size = "default",
  showIcon = false,
  iconMapping,
}: StatusBadgeProps) {
  const config = mapping[status] || {
    color: "#8c8c8c",
    backgroundColor: "#fafafa",
    label: status,
  };

  // Get icon from mapping or custom iconMapping
  let icon: ReactNode | undefined = config.icon;
  if (iconMapping && iconMapping[status]) {
    icon = iconMapping[status];
  }

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
      {showIcon && icon && (
        <span style={{ marginRight: 6 }}>{icon}</span>
      )}
      {config.label}
    </Tag>
  );
}
