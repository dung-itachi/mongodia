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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { Text } = Typography;

interface LeadAssignmentModeToggleProps {
  /** Compact mode: dùng button dạng icon-only với label tooltip */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

interface ModeInfo {
  titleKey: string;
  descriptionKey: string;
  benefitsKeys: string[];
  confirmTextKey: string;
  successKey: string;
  tooltipKey: string;
  labelKey: string;
  compactLabelKey: string;
}

const MODE_INFO: Record<LeadAssignmentMode, ModeInfo> = {
  AUTO: {
    titleKey: "Bật phân công tự động?",
    descriptionKey:
      "Mỗi khi bạn tạo Lead mới, hệ thống sẽ tự động chọn một Sale đang hoạt động để gán cho Lead đó.",
    benefitsKeys: [
      "Chỉ có 1 Sale trong hệ thống → Lead sẽ được gán cho ngay Sale đó.",
      "Nhiều Sale → hệ thống sẽ chia đều Lead cho người đang rảnh nhất.",
      "Bạn vẫn có thể đổi Sale khác sau đó ở trang /leads.",
    ],
    confirmTextKey: "Bật tự động",
    successKey:
      "Đã bật phân công tự động. Lead mới sẽ được tự động gán cho Sale.",
    tooltipKey: "Hệ thống sẽ tự động chọn Sale cho mỗi Lead mới",
    labelKey: "Phân công tự động",
    compactLabelKey: "Tự động",
  },
  MANUAL: {
    titleKey: "Chuyển sang phân công thủ công?",
    descriptionKey:
      "Khi tạo Lead mới, Lead sẽ chưa được gán cho Sale nào. Bạn sẽ tự chọn Sale phụ trách cho từng Lead ở trang /leads.",
    benefitsKeys: [
      "Phù hợp khi bạn muốn tự quyết định Sale nào sẽ chăm sóc Lead nào.",
      "Lead mới sẽ hiển thị ở mục \"Chưa phân công\" để bạn dễ theo dõi.",
    ],
    confirmTextKey: "Chuyển sang thủ công",
    successKey:
      "Đã chuyển sang phân công thủ công. Bạn sẽ tự chọn Sale cho từng Lead.",
    tooltipKey: "Bạn sẽ tự chọn Sale cho từng Lead ở trang /leads",
    labelKey: "Phân công thủ công",
    compactLabelKey: "Thủ công",
  },
};

export function LeadAssignmentModeToggle({
  compact = false,
  className,
}: LeadAssignmentModeToggleProps) {
  const lang = useLanguageStore((s) => s.language);
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
      onSuccess: () => {
        void message.success(t(MODE_INFO[target].successKey, lang));
      },
      onError: (err) => {
        void message.error(
          `${t("Không thể thay đổi kiểu phân công:", lang)} ${err.message}`
        );
      },
    });
  };

  const showConfirm = (target: LeadAssignmentMode) => {
    if (target === mode || updateMutation.isPending) return;

    const info = MODE_INFO[target];

    modal.confirm({
      title: t(info.titleKey, lang),
      icon: target === "AUTO" ? <ThunderboltOutlined /> : <EditOutlined />,
      width: 520,
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>{t(info.descriptionKey, lang)}</Text>
          <div style={{ marginTop: 12 }}>
            <Text strong>{t("Cách hoạt động:", lang)}</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
              {info.benefitsKeys.map((key, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  <Text type="secondary">{t(key, lang)}</Text>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
      okText: t(info.confirmTextKey, lang),
      cancelText: t("Hủy", lang),
      centered: true,
      onOk: () => applyMode(target),
    });
  };

  return (
    <Space.Compact className={className} size="middle">
      <Tooltip title={t(MODE_INFO.AUTO.tooltipKey, lang)}>
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
          {compact ? t(MODE_INFO.AUTO.compactLabelKey, lang) : t(MODE_INFO.AUTO.labelKey, lang)}
        </Button>
      </Tooltip>
      <Tooltip title={t(MODE_INFO.MANUAL.tooltipKey, lang)}>
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
          {compact ? t(MODE_INFO.MANUAL.compactLabelKey, lang) : t(MODE_INFO.MANUAL.labelKey, lang)}
        </Button>
      </Tooltip>
    </Space.Compact>
  );
}

export default LeadAssignmentModeToggle;

