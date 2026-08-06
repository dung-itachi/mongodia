"use client";

/**
 * ==================================================
 * ACTIVITY DRAWER COMPONENT
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Drawer for creating and editing customer activities.
 */

import { useEffect } from "react";
import { Drawer, Form, Input, Select, DatePicker, Button, message } from "antd";
import { useCreateCustomerActivity, useUpdateCustomerActivity } from "@/hooks/useCustomerActivities";
import { ActivityType, ActivityResult } from "@/types/customer-activity";

const { TextArea } = Input;

interface ActivityDrawerProps {
  open: boolean;
  customerId: string;
  activityId?: string | null;
  initialData?: {
    activityType?: ActivityType;
    title?: string;
    content?: string;
    nextFollowUpAt?: string;
    result?: ActivityResult;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { value: ActivityType.CALL, label: "Gọi điện" },
  { value: ActivityType.MEETING, label: "Gặp trực tiếp" },
  { value: ActivityType.NOTE, label: "Ghi chú" },
  { value: ActivityType.FOLLOW_UP, label: "Theo dõi" },
  { value: ActivityType.EMAIL, label: "Email" },
  { value: ActivityType.SMS, label: "SMS" },
  { value: ActivityType.OTHER, label: "Khác" },
];

const ACTIVITY_RESULTS = [
  { value: ActivityResult.SUCCESS, label: "Thành công" },
  { value: ActivityResult.FAILED, label: "Thất bại" },
  { value: ActivityResult.NO_ANSWER, label: "Không nghe máy" },
  { value: ActivityResult.PENDING, label: "Chờ xử lý" },
];

export default function ActivityDrawer({
  open,
  customerId,
  activityId,
  initialData,
  onClose,
  onSuccess,
}: ActivityDrawerProps) {
  const [form] = Form.useForm();
  const isEditing = !!activityId;

  const createMutation = useCreateCustomerActivity();
  const updateMutation = useUpdateCustomerActivity();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          activityType: initialData.activityType,
          title: initialData.title,
          content: initialData.content,
          nextFollowUpAt: initialData.nextFollowUpAt
            ? undefined
            : undefined,
          result: initialData.result,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        customerId,
        activityType: values.activityType as ActivityType,
        title: values.title,
        content: values.content,
        nextFollowUpAt: values.nextFollowUpAt?.toISOString(),
        result: values.result as ActivityResult | undefined,
      };

      if (isEditing && activityId) {
        await updateMutation.mutateAsync({
          id: activityId,
          input: {
            activityType: payload.activityType,
            title: payload.title,
            content: payload.content,
            nextFollowUpAt: payload.nextFollowUpAt,
            result: payload.result,
          },
        });
        message.success("Cập nhật hoạt động thành công");
      } else {
        await createMutation.mutateAsync({
          customerId,
          input: {
            ...payload,
            employeeId: "", // Will be set by API
          },
        });
        message.success("Tạo hoạt động thành công");
      }

      onSuccess();
      onClose();
      form.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || "Đã xảy ra lỗi");
      }
    }
  };

  return (
    <Drawer
      title={isEditing ? "Chỉnh sửa hoạt động" : "Tạo hoạt động mới"}
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" onClick={handleSubmit} loading={isLoading}>
            {isEditing ? "Cập nhật" : "Tạo mới"}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          activityType: ActivityType.CALL,
        }}
      >
        <Form.Item
          name="activityType"
          label="Loại hoạt động"
          rules={[{ required: true, message: "Vui lòng chọn loại hoạt động" }]}
        >
          <Select options={ACTIVITY_TYPES} placeholder="Chọn loại hoạt động" />
        </Form.Item>

        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
        >
          <Input placeholder="Nhập tiêu đề hoạt động" maxLength={500} />
        </Form.Item>

        <Form.Item name="content" label="Nội dung">
          <TextArea
            placeholder="Nhập nội dung chi tiết..."
            rows={4}
            maxLength={5000}
            showCount
          />
        </Form.Item>

        <Form.Item name="nextFollowUpAt" label="Lịch theo dõi tiếp">
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            placeholder="Chọn ngày giờ"
          />
        </Form.Item>

        <Form.Item name="result" label="Kết quả">
          <Select
            options={ACTIVITY_RESULTS}
            placeholder="Chọn kết quả"
            allowClear
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
