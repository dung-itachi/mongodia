/**
 * Lead Status Legend - Giải thích ý nghĩa các trạng thái lead
 */

import { Modal, Tag } from "antd";
import { LeadStatus } from "@/constants/leadStatus";

interface StatusInfo {
  status: LeadStatus;
  label: string;
  color: string;
  description: string;
  emoji: string;
}

const STATUS_INFO: StatusInfo[] = [
  {
    status: LeadStatus.NEW,
    label: "Mới",
    color: "blue",
    emoji: "🆕",
    description: "Lead vừa được tạo, chưa liên hệ lần nào. Cần gọi điện sớm.",
  },
  {
    status: LeadStatus.CONTACTED,
    label: "Đã liên hệ",
    color: "cyan",
    emoji: "📞",
    description: "Đã trao đổi với khách hàng nhưng chưa xác định nhu cầu rõ ràng.",
  },
  {
    status: LeadStatus.NO_ANSWER,
    label: "Không nghe máy",
    color: "gold",
    emoji: "📵",
    description: "Gọi nhưng khách không nghe. Nên gọi lại sau 2-4 tiếng hoặc hôm khác.",
  },
  {
    status: LeadStatus.QUALIFIED,
    label: "Đủ điều kiện",
    color: "geekblue",
    emoji: "✅",
    description: "Khách có nhu cầu, đủ khả năng tài chính. Sẵn sàng tư vấn sản phẩm.",
  },
  {
    status: LeadStatus.POTENTIAL,
    label: "Tiềm năng",
    color: "purple",
    emoji: "⭐",
    description: "Khách quan tâm, có thể chốt đơn. Cần theo sát và chăm sóc.",
  },
  {
    status: LeadStatus.CLOSED,
    label: "Đã chốt",
    color: "green",
    emoji: "🎉",
    description: "Khách đã đồng ý mua. Tiến hành tạo đơn hàng.",
  },
  {
    status: LeadStatus.LOST,
    label: "Không mua",
    color: "red",
    emoji: "❌",
    description: "Khách từ chối, không có nhu cầu. Kết thúc chăm sóc lead này.",
  },
  {
    status: LeadStatus.ORDER_CREATED,
    label: "Đã tạo đơn",
    color: "success",
    emoji: "📦",
    description: "Lead đã chuyển thành đơn hàng thành công.",
  },
  {
    status: LeadStatus.CANCELLED,
    label: "Hủy",
    color: "default",
    emoji: "🚫",
    description: "Đơn hàng hoặc quá trình xử lý bị hủy bỏ.",
  },
  {
    status: LeadStatus.REJECTED,
    label: "Từ chối",
    color: "volcano",
    emoji: "⛔",
    description: "Bị từ chối từ đầu (không đủ điều kiện, không phù hợp).",
  },
];

interface LeadStatusLegendProps {
  open: boolean;
  onClose: () => void;
}

export default function LeadStatusLegend({ open, onClose }: LeadStatusLegendProps) {
  return (
    <Modal
      title="📖 Ý nghĩa các trạng thái Lead"
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
                {info.label}
              </Tag>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {info.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
