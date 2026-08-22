"use client";

/**
 * LeadAssignmentModeToggle (Sprint 8.x)
 *
 * Component toggle giữa 2 chế độ phân công Lead cho Sale:
 *   - AUTO   : Mỗi Lead mới tạo sẽ tự động được gán cho 1 Sale.
 *   - MANUAL : Marketing tự gán Sale thủ công (flow cũ).
 *
 * Hiển thị 2 button dạng segmented control. Khi user click button khác với
 * mode hiện tại sẽ hiện popup xác nhận trước khi gọi mutation.
 *
 * Yêu cầu quyền: `system-settings.manage` (hoặc `*`) để thấy & tương tác.
 * Nếu không có quyền → component ẩn hoàn toàn.
 */

import { useEffect } from "react";
import { Button, Tooltip, App, Space, Modal, Typography } from "antd";
import {
  ThunderboltOutlined,
  EditOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import {
  useAssignmentMode,
  useUpdateAssignmentMode,
  type LeadAssignmentMode,
} from "@/hooks/useAssignmentMode";
import { useAuthStore } from "@/store/auth.store";

const { Text } = Typography;

interface LeadAssignmentModeToggleProps {
  /** Compact mode: dùng button dạng icon-only với label tooltip */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

interface ModeInfo {
  title: string;
  description: string;
  benefits: string[];
}

const MODE_INFO: Record<LeadAssignmentMode, ModeInfo> = {
  AUTO: {
    title: "Bật phân công tự động?",
    description:
      "Mỗi khi bạn tạo Lead mới, hệ thống sẽ tự động chọn một Sale đang hoạt động để gán cho Lead đó.",
    benefits: [
      "Chỉ có 1 Sale trong hệ thống → Lead sẽ được gán cho ngay Sale đó.",
      "Nhiều Sale → hệ thống sẽ chia đều Lead cho người đang rảnh nhất.",
      "Bạn vẫn có thể đổi Sale khác sau đó ở trang /leads.",
    ],
  },
  MANUAL: {
    title: "Chuyển sang phân công thủ công?",
    description:
      "Khi tạo Lead mới, Lead sẽ chưa được gán cho Sale nào. Bạn sẽ tự chọn Sale phụ trách cho từng Lead ở trang /leads.",
    benefits: [
      "Phù hợp khi bạn muốn tự quyết định Sale nào sẽ chăm sóc Lead nào.",
      "Lead mới sẽ hiển thị ở mục \"Chưa phân công\" để bạn dễ theo dõi.",
    ],
  },
};

export function LeadAssignmentModeToggle({
  compact = false,
  className,
}: LeadAssignmentModeToggleProps) {
  const { message, modal } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];

  const canManage =
    permissions.includes("*") ||
    permissions.includes("system-settings.manage");

  const { mode, loading, refetch } = useAssignmentMode();
  const updateMutation = useUpdateAssignmentMode();

  // Auto-refetch khi user thay đổi (login/logout)
  useEffect(() => {
    if (user) {
      void refetch();
    }
  }, [user, refetch]);

  // Không render nếu không có quyền
  if (!canManage) {
    return null;
  }

  const applyMode = (target: LeadAssignmentMode) => {
    updateMutation.mutate(target, {
      onSuccess: (saved) => {
        void message.success(
          saved.mode === "AUTO"
            ? "Đã bật phân công tự động. Lead mới sẽ được tự động gán cho Sale."
            : "Đã chuyển sang phân công thủ công. Bạn sẽ tự chọn Sale cho từng Lead."
        );
      },
      onError: (err) => {
        void message.error(
          `Không thể thay đổi kiểu phân công: ${err.message}`
        );
      },
    });
  };

  const showConfirm = (target: LeadAssignmentMode) => {
    if (target === mode || updateMutation.isPending) return;

    const info = MODE_INFO[target];

    modal.confirm({
      title: info.title,
      icon: target === "AUTO" ? <ThunderboltOutlined /> : <EditOutlined />,
      width: 520,
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>{info.description}</Text>
          <div style={{ marginTop: 12 }}>
            <Text strong>Cách hoạt động:</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
              {info.benefits.map((line, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  <Text type="secondary">{line}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
      okText: target === "AUTO" ? "Bật tự động" : "Chuyển sang thủ công",
      cancelText: "Hủy",
      centered: true,
      onOk: () => applyMode(target),
    });
  };

  return (
    <Space.Compact className={className} size="middle">
      <Tooltip title="Hệ thống sẽ tự động chọn Sale cho mỗi Lead mới">
        <Button
          type={mode === "AUTO" ? "primary" : "default"}
          icon={
            mode === "AUTO" ? (
              <CheckCircleFilled />
            ) : (
              <ThunderboltOutlined />
            )
          }
          loading={loading || updateMutation.isPending}
          onClick={() => showConfirm("AUTO")}
        >
          {compact ? "Tự động" : "Phân công tự động"}
        </Button>
      </Tooltip>
      <Tooltip title="Bạn sẽ tự chọn Sale cho từng Lead ở trang /leads">
        <Button
          type={mode === "MANUAL" ? "primary" : "default"}
          icon={
            mode === "MANUAL" ? (
              <CheckCircleFilled />
            ) : (
              <EditOutlined />
            )
          }
          loading={loading || updateMutation.isPending}
          onClick={() => showConfirm("MANUAL")}
        >
          {compact ? "Thủ công" : "Phân công thủ công"}
        </Button>
      </Tooltip>
    </Space.Compact>
  );
}

export default LeadAssignmentModeToggle;

