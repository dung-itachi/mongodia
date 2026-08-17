/**
 * Call Log Timeline Component (Module 6 - Nhật ký cuộc gọi)
 *
 * Hiển thị timeline các cuộc gọi cho một lead.
 * Mỗi cuộc gọi hiển thị: Thời gian, Sale, Trạng thái, Ghi chú.
 */

import { memo, useMemo } from "react";
import { Timeline, Tag, Typography, Empty, Card, Tooltip } from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { CallLogItem } from "@/hooks/useLeadCallLog";
import { LEAD_CALL_STATUS_LABELS, LeadCallStatus } from "@/constants/leadCallStatus";
import styles from "./call-log-timeline.module.css";

const { Text, Paragraph } = Typography;

interface CallLogTimelineProps {
  callHistory: CallLogItem[];
  loading?: boolean;
  showSaleName?: boolean;
  maxItems?: number;
}

/** Get icon cho từng trạng thái cuộc gọi */
function getCallStatusIcon(status: LeadCallStatus) {
  switch (status) {
    case LeadCallStatus.CONVERTED:
      return <SwapOutlined />;
    case LeadCallStatus.POTENTIAL:
      return <CheckCircleOutlined />;
    case LeadCallStatus.CALL_BACK:
      return <FieldTimeOutlined />;
    case LeadCallStatus.NO_ANSWER:
    case LeadCallStatus.BUSY:
      return <CloseCircleOutlined />;
    case LeadCallStatus.WRONG_NUMBER:
    case LeadCallStatus.NOT_INTERESTED:
      return <ExclamationCircleOutlined />;
    default:
      return <PhoneOutlined />;
  }
}

/** Get color cho từng trạng thái cuộc gọi */
function getCallStatusColor(status: LeadCallStatus): string {
  switch (status) {
    case LeadCallStatus.CONVERTED:
      return "success";
    case LeadCallStatus.POTENTIAL:
      return "processing";
    case LeadCallStatus.CALL_BACK:
      return "warning";
    case LeadCallStatus.NO_ANSWER:
    case LeadCallStatus.BUSY:
      return "error";
    case LeadCallStatus.WRONG_NUMBER:
    case LeadCallStatus.NOT_INTERESTED:
      return "default";
    default:
      return "default";
  }
}

/** Format thời gian cuộc gọi */
function formatCallTime(dateString: string): string {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${time} - ${day}`;
}

function CallLogTimelineInner({
  callHistory,
  loading = false,
  showSaleName = true,
  maxItems,
}: CallLogTimelineProps) {
  // Limit items nếu được chỉ định
  const displayItems = useMemo(() => {
    if (maxItems && callHistory.length > maxItems) {
      return callHistory.slice(0, maxItems);
    }
    return callHistory;
  }, [callHistory, maxItems]);

  // Kiểm tra xem có nhiều hơn maxItems không
  const hasMore = maxItems && callHistory.length > maxItems;

  // Render mỗi item trong timeline
  const timelineItems = useMemo(
    () =>
      displayItems.map((call) => ({
        key: call.id,
        color: getCallStatusColor(call.status),
        dot: getCallStatusIcon(call.status),
        children: (
          <div className={styles.timelineItem}>
            <div className={styles.itemHeader}>
              <Tag color={getCallStatusColor(call.status)} className={styles.statusTag}>
                {LEAD_CALL_STATUS_LABELS[call.status]}
              </Tag>
              <Text type="secondary" className={styles.callTime}>
                <ClockCircleOutlined /> {formatCallTime(call.callTime)}
              </Text>
            </div>

            {showSaleName && call.sale && (
              <div className={styles.itemSale}>
                <UserOutlined /> {call.sale.name}
              </div>
            )}

            {call.note && (
              <Paragraph
                className={styles.note}
                ellipsis={{ rows: 2, expandable: true, symbol: "thêm" }}
              >
                {call.note}
              </Paragraph>
            )}

            {call.duration && (
              <Tooltip title="Thời lượng cuộc gọi">
                <Text type="secondary" className={styles.duration}>
                  <ClockCircleOutlined /> {Math.floor(call.duration / 60)}p {call.duration % 60}s
                </Text>
              </Tooltip>
            )}
          </div>
        ),
      })),
    [displayItems, showSaleName]
  );

  if (!loading && callHistory.length === 0) {
    return (
      <Card size="small" className={styles.emptyCard}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có cuộc gọi nào"
        />
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      {hasMore && (
        <Text type="secondary" className={styles.showMore}>
          Hiển thị {maxItems} / {callHistory.length} cuộc gọi
        </Text>
      )}
      <Timeline
        className={styles.timeline}
        items={timelineItems}
      />
    </div>
  );
}

const CallLogTimeline = memo(CallLogTimelineInner);
export default CallLogTimeline;
