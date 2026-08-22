/**
 * StatusBadge Component (Sprint 3.1 - Complete UI Kit)
 * Sprint 6.2 - Order Workflow: Added icon support
 *
 * Display status with standardized colors and optional icons.
 */

import { Tag, Tooltip } from "antd";
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
  UserSwitchOutlined,
} from "@ant-design/icons";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

/**
 * Get translated label for a status badge
 */
function getTranslatedLabel(label: string): string {
  const language = useLanguageStore.getState().language;
  return t(label, language);
}

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
  UserSwitchOutlined: <UserSwitchOutlined />,
};

export type StatusConfig = {
  color: string;
  backgroundColor: string;
  label: string;
  icon?: ReactNode;
  tooltip?: string;
};

export type StatusBadgeProps = {
  status: string;
  mapping?: Record<string, StatusConfig>;
  size?: "small" | "default";
  showIcon?: boolean;
  iconMapping?: Record<string, ReactNode>;
  tooltip?: string;
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

  // Success statuses
  success: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  SUCCESS: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Thành công" },
  CONFIRMED: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đã xác nhận", icon: ICON_MAP.CheckOutlined, tooltip: "Đơn đã được xác nhận, sẵn sàng chuyển giao cho kho" },
  DELIVERED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao", icon: ICON_MAP.CheckCircleOutlined, tooltip: "Giao hàng thành công, đang chờ đối soát với shipper" },

  // Order statuses (Sprint 6.2)
  WAIT_CONFIRM: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ xác nhận", icon: ICON_MAP.ClockCircleOutlined, tooltip: "Sale vừa chốt đơn, chưa xác nhận lại với khách" },
  PACKING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Đang đóng gói", icon: ICON_MAP.InboxOutlined, tooltip: "Nhân viên kho đang chuẩn bị và đóng gói đơn hàng" },
  SHIPPING: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đang giao", icon: ICON_MAP.CarOutlined, tooltip: "Đơn hàng đang được vận chuyển đến khách" },
  SHIPPED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đã giao hàng", tooltip: "Giao hàng thành công, đang chờ đối soát" },
  RETURNED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Đã hoàn trả", icon: ICON_MAP.UndoOutlined, tooltip: "Khách không nhận hàng, đơn hàng đã được hoàn về" },
  RECONCILED: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Đối soát", icon: ICON_MAP.CheckCircleOutlined, tooltip: "Shipper đã trả tiền — đây mới là doanh thu thực" },
  CANCELLED: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Đã hủy", icon: ICON_MAP.CloseCircleOutlined, tooltip: "Đơn hàng đã bị hủy, không được tính doanh thu" },
  REJECTED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Bị từ chối", icon: ICON_MAP.StopOutlined },
  FAILED: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Giao thất bại", icon: ICON_MAP.WarningOutlined },

  // Lead statuses (Marketing)
  NEW: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Mới", icon: ICON_MAP.InboxOutlined },
  CONTACTED: { color: "#13c2c2", backgroundColor: "#e6fffb", label: "Đã liên hệ", icon: ICON_MAP.CheckOutlined },
  QUALIFIED: { color: "#722ed1", backgroundColor: "#f9f0ff", label: "Đủ điều kiện", icon: ICON_MAP.CheckCircleOutlined },
  ASSIGNED: { color: "#722ed1", backgroundColor: "#f9f0ff", label: "Đã phân công", icon: ICON_MAP.UserSwitchOutlined },
  PROCESSING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Đang xử lý", icon: ICON_MAP.ClockCircleOutlined },
  NO_ANSWER: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Không nghe máy" },
  POTENTIAL: { color: "#52c41a", backgroundColor: "#f6ffed", label: "Tiềm năng", icon: ICON_MAP.WarningOutlined },
  CLOSED: { color: "#2f54eb", backgroundColor: "#e6f4ff", label: "Đã chốt", icon: ICON_MAP.CheckCircleOutlined },
  LOST: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Không mua", icon: ICON_MAP.CloseCircleOutlined },
  ORDER_CREATED: { color: "#1890ff", backgroundColor: "#e6f7ff", label: "Đã tạo đơn", icon: ICON_MAP.WalletOutlined },

  // Error statuses
  error: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },
  ERROR: { color: "#ff4d4f", backgroundColor: "#fff1f0", label: "Lỗi" },

  // Warning/Cancelled
  WARNING: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Cảnh báo" },

  // Other common statuses
  draft: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  DRAFT: { color: "#8c8c8c", backgroundColor: "#fafafa", label: "Bản nháp" },
  PENDING_PAYMENT: { color: "#fa8c16", backgroundColor: "#fff7e6", label: "Chờ thanh toán" },
};

/**
 * Lead-status specific badge mapping (Marketing context).
 * Exported so the LeadTable can use the lead-specific color/icon set
 * without inheriting colors from order/inventory statuses.
 */
export const LEAD_STATUS_BADGE_MAPPING: Record<string, StatusConfig> = {
  NEW: DEFAULT_STATUS_MAPPING.NEW,
  CONTACTED: DEFAULT_STATUS_MAPPING.CONTACTED,
  QUALIFIED: DEFAULT_STATUS_MAPPING.QUALIFIED,
  ASSIGNED: DEFAULT_STATUS_MAPPING.ASSIGNED,
  PROCESSING: DEFAULT_STATUS_MAPPING.PROCESSING,
  NO_ANSWER: DEFAULT_STATUS_MAPPING.NO_ANSWER,
  POTENTIAL: DEFAULT_STATUS_MAPPING.POTENTIAL,
  CLOSED: DEFAULT_STATUS_MAPPING.CLOSED,
  LOST: DEFAULT_STATUS_MAPPING.LOST,
  ORDER_CREATED: DEFAULT_STATUS_MAPPING.ORDER_CREATED,
  // Lead-specific labels (overrides Order "Đã hủy" / "Bị từ chối")
  REJECTED: { ...DEFAULT_STATUS_MAPPING.REJECTED, label: "Từ chối" },
  CANCELLED: { ...DEFAULT_STATUS_MAPPING.CANCELLED, label: "Hủy" },
};

export default function StatusBadge({
  status,
  mapping = DEFAULT_STATUS_MAPPING,
  size = "default",
  showIcon = false,
  iconMapping,
  tooltip,
}: StatusBadgeProps) {
  const config = mapping[status] || {
    color: "#8c8c8c",
    backgroundColor: "#fafafa",
    label: status,
  };

  const tooltipText = tooltip ?? config.tooltip;
  let icon: ReactNode | undefined = config.icon;
  if (iconMapping && iconMapping[status]) {
    icon = iconMapping[status];
  }

  const tag = (
    <Tag
      color={config.backgroundColor}
      style={{
        color: config.color,
        borderColor: config.color,
        fontSize: size === "small" ? 12 : 14,
        padding: size === "small" ? "0 6px" : "2px 8px",
        cursor: tooltipText ? "help" : undefined,
      }}
    >
      {showIcon && icon && (
        <span style={{ marginRight: 6 }}>{icon}</span>
      )}
      {getTranslatedLabel(config.label)}
    </Tag>
  );

  if (tooltipText) {
    return <Tooltip title={tooltipText}>{tag}</Tooltip>;
  }

  return tag;
}
