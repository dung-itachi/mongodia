/**
 * Lead Status Legend - Status meaning explanation
 */

import { Modal, Tag } from "antd";
import { LeadStatus } from "@/constants/leadStatus";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface StatusInfo {
  status: LeadStatus;
  labelKey: string;
  color: string;
  emoji: string;
  descriptionKey: string;
}

const STATUS_INFO: StatusInfo[] = [
      {
        status: LeadStatus.NEW,
        labelKey: "Mới",
        color: "blue",
        emoji: "🆕",
        descriptionKey: "Khách hàng vừa được tạo, chưa liên hệ lần nào. Cần gọi điện sớm.",
      },
  {
    status: LeadStatus.CONTACTED,
    labelKey: "Đã liên hệ",
    color: "cyan",
    emoji: "📞",
    descriptionKey: "Đã trao đổi với khách hàng nhưng chưa xác định nhu cầu rõ ràng.",
  },
  {
    status: LeadStatus.NO_ANSWER,
    labelKey: "Không nghe máy",
    color: "gold",
    emoji: "📵",
    descriptionKey: "Gọi nhưng khách không nghe. Nên gọi lại sau 2-4 tiếng hoặc hôm khác.",
  },
  {
    status: LeadStatus.QUALIFIED,
    labelKey: "Đủ điều kiện",
    color: "geekblue",
    emoji: "✅",
    descriptionKey: "Khách có nhu cầu, đủ khả năng tài chính. Sẵn sàng tư vấn sản phẩm.",
  },
  {
    status: LeadStatus.POTENTIAL,
    labelKey: "Tiềm năng",
    color: "purple",
    emoji: "⭐",
    descriptionKey: "Khách quan tâm, có thể chốt đơn. Cần theo sát và chăm sóc.",
  },
  {
    status: LeadStatus.CLOSED,
    labelKey: "Đã chốt",
    color: "green",
    emoji: "🎉",
    descriptionKey: "Khách đã đồng ý mua. Tiến hành tạo đơn hàng.",
  },
      {
        status: LeadStatus.LOST,
        labelKey: "Không mua",
        color: "red",
        emoji: "❌",
        descriptionKey: "Khách hàng từ chối, không có nhu cầu. Kết thúc chăm sóc khách hàng này.",
      },
      {
        status: LeadStatus.ORDER_CREATED,
        labelKey: "Đã tạo đơn",
        color: "success",
        emoji: "📦",
        descriptionKey: "Khách hàng đã chuyển thành đơn hàng thành công.",
      },
  {
    status: LeadStatus.CANCELLED,
    labelKey: "Hủy",
    color: "default",
    emoji: "🚫",
    descriptionKey: "Đơn hàng hoặc quá trình xử lý bị hủy bỏ.",
  },
  {
    status: LeadStatus.REJECTED,
    labelKey: "Từ chối",
    color: "volcano",
    emoji: "⛔",
    descriptionKey: "Bị từ chối từ đầu (không đủ điều kiện, không phù hợp).",
  },
];

interface LeadStatusLegendProps {
  open: boolean;
  onClose: () => void;
}

export default function LeadStatusLegend({ open, onClose }: LeadStatusLegendProps) {
  const lang = useLanguageStore((s) => s.language);
  return (
    <Modal
      title={t("📖 Ý nghĩa các trạng thái", lang)}
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STATUS_INFO.map((info) => (
          <div
            key={info.status}
            style={{
              padding: 10,
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 20 }}>{info.emoji}</span>
            <div style={{ flex: 1 }}>
              <Tag color={info.color} style={{ fontWeight: 600 }}>
                {t(info.labelKey, lang)}
              </Tag>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {t(info.descriptionKey, lang)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
