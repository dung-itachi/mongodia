"use client";

/**
 * ==================================================
 * CUSTOMER TIMELINE COMPONENT
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Timeline display for customer activities.
 */

import { useMemo, useState } from "react";
import { Timeline, Card, Tag, Button, Empty, Dropdown } from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  FileTextOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import PermissionGate from "@/components/common/PermissionGate";
import SkeletonCard from "@/components/common/overlay/SkeletonCard";
import ActivityDrawer from "./ActivityDrawer";
import { useCustomerActivities, useDeleteCustomerActivity } from "@/hooks/useCustomerActivities";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityType, ActivityResult } from "@/types/customer-activity";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

interface CustomerTimelineProps {
  customerId: string;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  CALL: <PhoneOutlined />,
  MEETING: <UserOutlined />,
  NOTE: <FileTextOutlined />,
  FOLLOW_UP: <BellOutlined />,
  EMAIL: <MailOutlined />,
  SMS: <MessageOutlined />,
  OTHER: <FileTextOutlined />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  CALL: "blue",
  MEETING: "purple",
  NOTE: "gray",
  FOLLOW_UP: "orange",
  EMAIL: "cyan",
  SMS: "green",
  OTHER: "default",
};

const RESULT_COLORS: Record<ActivityResult, string> = {
  SUCCESS: "success",
  FAILED: "error",
  NO_ANSWER: "warning",
  PENDING: "default",
};

export default function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const lang = useLanguageStore((s) => s.language);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const message = useMessage();
  const [editingActivity, setEditingActivity] = useState<{
    id: string;
    data: {
      activityType?: ActivityType;
      title?: string;
      content?: string;
      nextFollowUpAt?: string;
      result?: ActivityResult;
    };
  } | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useCustomerActivities(customerId, {
    page,
    pageSize: 20,
    sortOrder: "desc",
  });

  const deleteMutation = useDeleteCustomerActivity();

  const activities = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const RESULT_LABELS = useMemo<Record<ActivityResult, string>>(
    () => ({
      SUCCESS: t("Thành công", lang),
      FAILED: t("Thất bại", lang),
      NO_ANSWER: t("Không nghe máy", lang),
      PENDING: t("Chờ xử lý", lang),
    }),
    [lang]
  );

  const ACTIVITY_TYPE_LABELS = useMemo<Record<ActivityType, string>>(
    () => ({
      CALL: t("Gọi điện", lang),
      MEETING: t("Gặp trực tiếp", lang),
      NOTE: t("Ghi chú", lang),
      FOLLOW_UP: t("Theo dõi", lang),
      EMAIL: t("Email", lang),
      SMS: t("SMS", lang),
      OTHER: t("Khác", lang),
    }),
    [lang]
  );

  const handleEdit = (activity: {
    _id: string;
    activityType: ActivityType;
    title: string;
    content?: string;
    nextFollowUpAt?: string;
    result?: ActivityResult;
  }) => {
    setEditingActivity({
      id: activity._id,
      data: {
        activityType: activity.activityType,
        title: activity.title,
        content: activity.content,
        nextFollowUpAt: activity.nextFollowUpAt,
        result: activity.result,
      },
    });
    setDrawerOpen(true);
  };

  const handleDelete = async (activityId: string) => {
    try {
      await deleteMutation.mutateAsync(activityId);
      message.success(t("Xóa hoạt động thành công", lang));
      queryClient.invalidateQueries({ queryKey: ["customer-activities", customerId] });
    } catch {
      message.error(t("Không thể xóa hoạt động", lang));
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingActivity(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["customer-activities", customerId] });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#8c8c8c" }}>
          {total} {t("hoạt động", lang)}
        </span>
        <PermissionGate permission="customer-activity.create">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
          >
            {t("Thêm hoạt động", lang)}
          </Button>
        </PermissionGate>
      </div>

      {activities.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("Chưa có hoạt động nào", lang)}
        >
          <PermissionGate permission="customer-activity.create">
            <Button type="primary" onClick={() => setDrawerOpen(true)}>
              {t("Thêm hoạt động đầu tiên", lang)}
            </Button>
          </PermissionGate>
        </Empty>
      ) : (
        <>
          <Timeline
            items={activities.map((activity) => ({
              icon: (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `var(--ant-color-${ACTIVITY_COLORS[activity.activityType]}-bg, #f0f0f0)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: `var(--ant-color-${ACTIVITY_COLORS[activity.activityType]}-color, #000)`,
                  }}
                >
                  {ACTIVITY_ICONS[activity.activityType]}
                </div>
              ),
              content: (
                <Card
                  size="small"
                  style={{ marginBottom: 8 }}
                  title={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <Tag color={ACTIVITY_COLORS[activity.activityType]}>
                          {ACTIVITY_TYPE_LABELS[activity.activityType]}
                        </Tag>
                        <span style={{ marginLeft: 8, fontWeight: 600 }}>{activity.title}</span>
                      </div>
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: "edit",
                              icon: <EditOutlined />,
                              label: t("Chỉnh sửa", lang),
                              onClick: () => handleEdit(activity),
                            },
                            {
                              key: "delete",
                              icon: <DeleteOutlined />,
                              label: t("Xóa", lang),
                              danger: true,
                              onClick: () => handleDelete(activity._id),
                            },
                          ],
                        }}
                        trigger={["click"]}
                      >
                        <Button type="text" size="small">...</Button>
                      </Dropdown>
                    </div>
                  }
                >
                  {activity.content && (
                    <p style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>
                      {activity.content}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#8c8c8c" }}>
                    <span>{formatDate(activity.createdAt)}</span>
                    {activity.result && (
                      <Tag color={RESULT_COLORS[activity.result]}>{RESULT_LABELS[activity.result]}</Tag>
                    )}
                    {activity.nextFollowUpAt && (
                      <span>
                        <BellOutlined style={{ marginRight: 4 }} />
                        {t("Theo dõi", lang)}: {formatDate(activity.nextFollowUpAt)}
                      </span>
                    )}
                  </div>
                </Card>
              ),
            }))}
          />

          {page < totalPages && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button onClick={() => setPage(page + 1)} loading={isFetching}>
                {t("Xem thêm", lang)}
              </Button>
            </div>
          )}
        </>
      )}

      <ActivityDrawer
        open={drawerOpen}
        customerId={customerId}
        activityId={editingActivity?.id}
        initialData={editingActivity?.data}
        onClose={handleDrawerClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}