"use client";

/**
 * Lead Activity Panel - Performance optimized component
 * 
 * Fetch cả timeline và call history trong 1 request
 * thay vì gọi 2 API riêng biệt
 */

import { CardSection, SkeletonCard, EmptyState } from "@/components/common";
import CallLogTimeline from "./CallLogTimeline";
import { useLeadTimelineCombined, type CombinedTimelineItem } from "@/hooks/useLeadCallLog";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import { Timeline, Tag } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import styles from "@/app/(protected)/marketing/input/[id]/lead-detail.module.css";

dayjs.extend(relativeTime);

interface LeadActivityPanelProps {
  leadId: string;
}

function getActionLabel(action: string): string {
  const lang = useLanguageStore.getState().language;
  const labels: Record<string, string> = {
    CREATED: t("Khách hàng được tạo", lang),
    UPDATED: t("Khách hàng được cập nhật", lang),
    ASSIGNED: t("Sale được gán", lang),
    UNASSIGNED: t("Sale bị hủy gán", lang),
    STATUS_CHANGED: t("Trạng thái thay đổi", lang),
    ORDER_CREATED: t("Đơn hàng được tạo", lang),
    ORDER_CANCELLED: t("Đơn hàng bị hủy", lang),
    SALE_CHANGED: t("Sale phụ trách thay đổi", lang),
    MARKETING_CHANGED: t("Marketing phụ trách thay đổi", lang),
    NOTE_UPDATED: t("Ghi chú được cập nhật", lang),
    DELETED: t("Khách hàng bị xóa", lang),
  };
  return labels[action] ?? action;
}

function getActionDescription(item: {
  action: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}): React.ReactNode {
  if (item.action === "ASSIGNED" && item.note) {
    const parts = item.note.split("→");
    if (parts.length === 2) {
      const oldPart = parts[0].replace(/^.*\s/, "").replace(/[\(\)]/g, "").trim();
      const newPart = parts[1].replace(/[\(\)]/g, "").trim();
      return (
        <span>
          Sale: <strong>{oldPart}</strong> → <strong>{newPart}</strong>
        </span>
      );
    }
  }

  if (item.action === "STATUS_CHANGED" && item.oldValue && item.newValue) {
    return (
      <span>
        <Tag>{item.oldValue}</Tag> → <Tag>{item.newValue}</Tag>
      </span>
    );
  }

  if (item.note) {
    return <span>{item.note}</span>;
  }

  return null;
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATED: "blue",
    UPDATED: "gray",
    ASSIGNED: "green",
    UNASSIGNED: "orange",
    STATUS_CHANGED: "blue",
    ORDER_CREATED: "green",
    ORDER_CANCELLED: "red",
    SALE_CHANGED: "purple",
    MARKETING_CHANGED: "purple",
    NOTE_UPDATED: "gray",
    DELETED: "red",
  };
  return colors[action] ?? "gray";
}

// Timeline Tab Component
function TimelineTabContent({ items }: { items: CombinedTimelineItem[] }) {
  const lang = useLanguageStore((s) => s.language);

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("Chưa có lịch sử Timeline", lang)}
        description={t("Các thay đổi của Khách hàng sẽ hiển thị tại đây.", lang)}
      />
    );
  }

  return (
    <Timeline
      aria-label="Lead activity timeline"
      items={items.map((item) => {
        const actionLabel = getActionLabel(item.action);
        const description = getActionDescription(item);

        return {
          color: getActionColor(item.action),
          content: (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{actionLabel}</div>
              {description && (
                <div style={{ color: "#595959", marginBottom: 4 }}>{description}</div>
              )}
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {item.employee?.name ?? "Hệ thống"}
                {" · "}
                {dayjs(item.createdAt).fromNow()}
              </div>
            </div>
          ),
        };
      })}
    />
  );
}

// Call History Tab Component
function CallHistoryTabContent({ callHistory }: { callHistory: any[] }) {
  const lang = useLanguageStore((s) => s.language);

  if (callHistory.length === 0) {
    return (
      <EmptyState
        title={t("Chưa có cuộc gọi nào", lang)}
        description={t("Lịch sử các cuộc gọi sẽ hiển thị tại đây.", lang)}
      />
    );
  }

  return <CallLogTimeline callHistory={callHistory} showSaleName />;
}

// Main Panel - Fetches combined data once
export function LeadActivityPanel({ leadId }: LeadActivityPanelProps) {
  const lang = useLanguageStore((s) => s.language);
  const { timeline, callHistory, loading, error } = useLeadTimelineCombined(leadId);

  if (loading) {
    return (
      <div className={styles["tab-content"]}>
        <CardSection>
          <SkeletonCard rows={5} />
        </CardSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["tab-content"]}>
        <CardSection>
          <EmptyState
            title={t("Không thể tải lịch sử", lang)}
            description={error}
          />
        </CardSection>
      </div>
    );
  }

  // Return combined data for parent to use
  return (
    <div data-timeline={JSON.stringify(timeline)} data-calls={JSON.stringify(callHistory)}>
      {/* Hidden data for child tabs to consume via ref or context */}
    </div>
  );
}

// Separate tab content components that can be used with the combined hook
export function TimelineTabContentWrapper({ leadId }: { leadId: string }) {
  const { timeline, loading, error } = useLeadTimelineCombined(leadId);
  const lang = useLanguageStore((s) => s.language);

  if (loading) {
    return <SkeletonCard rows={5} />;
  }

  if (error) {
    return (
      <EmptyState
        title={t("Không thể tải Timeline", lang)}
        description={error}
      />
    );
  }

  return <TimelineTabContent items={timeline} />;
}

export function CallHistoryTabContentWrapper({ leadId }: { leadId: string }) {
  const { callHistory, loading, error } = useLeadTimelineCombined(leadId);
  const lang = useLanguageStore((s) => s.language);

  if (loading) {
    return <SkeletonCard rows={5} />;
  }

  if (error) {
    return (
      <EmptyState
        title={t("Không thể tải lịch sử cuộc gọi", lang)}
        description={error}
      />
    );
  }

  return <CallHistoryTabContent callHistory={callHistory} />;
}
