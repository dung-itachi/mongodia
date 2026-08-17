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

import { useState } from "react";
import { Timeline, Card, Tag, Button, Empty, Spin, Dropdown } from "antd";
import type { MenuProps } from "antd";
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

const RESULT_LABELS: Record<ActivityResult, string> = {
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  NO_ANSWER: "Không nghe máy",
  PENDING: "Chờ xử lý",
};

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Gọi điện",
  MEETING: "Gặp trực tiếp",
  NOTE: "Ghi chú",
  FOLLOW_UP: "Theo dõi",
  EMAIL: "Email",
  SMS: "SMS",
  OTHER: "Khác",
};

export default function CustomerTimeline({ customerId }: CustomerTimelineProps) {
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
      message.success("Xóa hoạt động thành công");
      queryClient.invalidateQueries({ queryKey: ["customer-activities", customerId] });
    } catch (error) {
      message.error("Không thể xóa hoạt động");
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
          {total} hoạt động
        </span>
        <PermissionGate permission="customer-activity.create">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
          >
            Thêm hoạt động
          </Button>
        </PermissionGate>
      </div>

      {activities.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có hoạt động nào"
        >
          <PermissionGate permission="customer-activity.create">
            <Button type="primary" onClick={() => setDrawerOpen(true)}>
              Thêm hoạt động đầu tiên
            </Button>
          </PermissionGate>
        </Empty>
      ) : (
        <>
          <Timeline
            items={activities.map((activity) => ({
              dot: (
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
              children: (
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
                              label: "Chỉnh sửa",
                              onClick: () => handleEdit(activity),
                            },
                            {
                              key: "delete",
                              icon: <DeleteOutlined />,
                              label: "Xóa",
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
                        Theo dõi: {formatDate(activity.nextFollowUpAt)}
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
                Xem thêm
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
