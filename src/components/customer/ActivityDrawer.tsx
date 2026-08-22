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

import { useEffect, useMemo } from "react";
import { Drawer, Form, Input, Select, DatePicker, Button } from "antd";
import { useCreateCustomerActivity, useUpdateCustomerActivity } from "@/hooks/useCustomerActivities";
import { ActivityType, ActivityResult } from "@/types/customer-activity";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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

export default function ActivityDrawer({
  open,
  customerId,
  activityId,
  initialData,
  onClose,
  onSuccess,
}: ActivityDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
  const [form] = Form.useForm();
  const isEditing = !!activityId;
  const message = useMessage();

  const createMutation = useCreateCustomerActivity();
  const updateMutation = useUpdateCustomerActivity();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const ACTIVITY_TYPES = useMemo(
    () => [
      { value: ActivityType.CALL, label: t("Gọi điện", lang) },
      { value: ActivityType.MEETING, label: t("Gặp trực tiếp", lang) },
      { value: ActivityType.NOTE, label: t("Ghi chú", lang) },
      { value: ActivityType.FOLLOW_UP, label: t("Theo dõi", lang) },
      { value: ActivityType.EMAIL, label: t("Email", lang) },
      { value: ActivityType.SMS, label: t("SMS", lang) },
      { value: ActivityType.OTHER, label: t("Khác", lang) },
    ],
    [lang]
  );

  const ACTIVITY_RESULTS = useMemo(
    () => [
      { value: ActivityResult.SUCCESS, label: t("Thành công", lang) },
      { value: ActivityResult.FAILED, label: t("Thất bại", lang) },
      { value: ActivityResult.NO_ANSWER, label: t("Không nghe máy", lang) },
      { value: ActivityResult.PENDING, label: t("Chờ xử lý", lang) },
    ],
    [lang]
  );

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
        message.success(t("Cập nhật hoạt động thành công", lang));
      } else {
        await createMutation.mutateAsync({
          customerId,
          input: {
            ...payload,
            employeeId: "", // Will be set by API
          },
        });
        message.success(t("Tạo hoạt động thành công", lang));
      }

      onSuccess();
      onClose();
      form.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || t("Đã xảy ra lỗi", lang));
      }
    }
  };

  return (
    <Drawer
      title={isEditing ? t("Chỉnh sửa hoạt động", lang) : t("Tạo hoạt động mới", lang)}
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>{t("Hủy", lang)}</Button>
          <Button type="primary" onClick={handleSubmit} loading={isLoading}>
            {isEditing ? t("Cập nhật", lang) : t("Tạo mới", lang)}
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
          label={t("Loại hoạt động", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn loại hoạt động", lang) }]}
        >
          <Select options={ACTIVITY_TYPES} placeholder={t("Chọn loại hoạt động", lang)} />
        </Form.Item>

        <Form.Item
          name="title"
          label={t("Tiêu đề", lang)}
          rules={[{ required: true, message: t("Vui lòng nhập tiêu đề", lang) }]}
        >
          <Input placeholder={t("Nhập tiêu đề hoạt động", lang)} maxLength={500} />
        </Form.Item>

        <Form.Item name="content" label={t("Nội dung", lang)}>
          <TextArea
            placeholder={t("Nhập nội dung chi tiết...", lang)}
            rows={4}
            maxLength={5000}
            showCount
          />
        </Form.Item>

        <Form.Item name="nextFollowUpAt" label={t("Lịch theo dõi tiếp", lang)}>
          <DatePicker
            showTime
            classNames={{ popup: { root: "picker-with-time" } }}
            format="YYYY-MM-DD HH:mm"
            style={{ width: "100%" }}
            placeholder={t("Chọn ngày giờ", lang)}
          />
        </Form.Item>

        <Form.Item name="result" label={t("Kết quả", lang)}>
          <Select
            options={ACTIVITY_RESULTS}
            placeholder={t("Chọn kết quả", lang)}
            allowClear
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}